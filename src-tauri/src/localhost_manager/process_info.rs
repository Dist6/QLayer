use super::models::ProcessMetadata;

const WINDOWS_TO_UNIX_EPOCH_100NS: u64 = 116_444_736_000_000_000;

pub(crate) fn inspect_process(pid: u32) -> ProcessMetadata {
    platform::inspect_process(pid)
}

pub(crate) fn filetime_ticks(high: u32, low: u32) -> u64 {
    (u64::from(high) << 32) | u64::from(low)
}

pub(crate) fn filetime_to_unix_ms(ticks: u64) -> Option<u64> {
    ticks
        .checked_sub(WINDOWS_TO_UNIX_EPOCH_100NS)
        .map(|unix_ticks| unix_ticks / 10_000)
}

#[cfg(windows)]
mod platform {
    use super::{filetime_ticks, filetime_to_unix_ms, ProcessMetadata};
    use std::ffi::c_void;
    use std::mem::size_of;
    use std::path::Path;
    use windows::core::PWSTR;
    use windows::Wdk::System::Threading::{
        NtQueryInformationProcess, ProcessCommandLineInformation,
    };
    use windows::Win32::Foundation::{CloseHandle, FILETIME, HANDLE, UNICODE_STRING};
    use windows::Win32::System::ProcessStatus::{
        GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS,
    };
    use windows::Win32::System::Threading::{
        GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };

    struct ProcessHandle(HANDLE);

    impl Drop for ProcessHandle {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }

    pub(super) fn inspect_process(pid: u32) -> ProcessMetadata {
        let Ok(handle) = (unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) })
        else {
            return ProcessMetadata::default();
        };
        let handle = ProcessHandle(handle);
        let executable_path = query_image_path(handle.0);
        let command_line = query_command_line(handle.0);
        let process_name = executable_path
            .as_deref()
            .and_then(|path| Path::new(path).file_name())
            .map(|name| name.to_string_lossy().into_owned());
        let memory_bytes = query_memory(handle.0);
        let timing = query_timing(handle.0);

        ProcessMetadata {
            process_name,
            executable_path,
            command_line,
            memory_bytes,
            started_at_ms: timing.and_then(|value| filetime_to_unix_ms(value.creation_ticks)),
            creation_ticks: timing.map(|value| value.creation_ticks),
            cpu_ticks: timing.map(|value| value.cpu_ticks),
        }
    }

    #[derive(Clone, Copy)]
    struct ProcessTiming {
        creation_ticks: u64,
        cpu_ticks: u64,
    }

    fn query_image_path(handle: HANDLE) -> Option<String> {
        let mut buffer = vec![0_u16; 32_768];
        let mut length = buffer.len() as u32;
        unsafe {
            QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_WIN32,
                PWSTR(buffer.as_mut_ptr()),
                &mut length,
            )
        }
        .ok()?;
        buffer.truncate(length as usize);
        Some(String::from_utf16_lossy(&buffer))
    }

    fn query_command_line(handle: HANDLE) -> Option<String> {
        const MAX_COMMAND_LINE_BYTES: u32 = 64 * 1024;

        let mut required = 0_u32;
        let _ = unsafe {
            NtQueryInformationProcess(
                handle,
                ProcessCommandLineInformation,
                std::ptr::null_mut(),
                0,
                &mut required,
            )
        };
        if required < size_of::<UNICODE_STRING>() as u32 || required > MAX_COMMAND_LINE_BYTES {
            return None;
        }

        let word_size = size_of::<usize>();
        let word_count = (required as usize).div_ceil(word_size);
        let mut storage = vec![0_usize; word_count];
        let status = unsafe {
            NtQueryInformationProcess(
                handle,
                ProcessCommandLineInformation,
                storage.as_mut_ptr().cast::<c_void>(),
                required,
                &mut required,
            )
        };
        if status.0 < 0 {
            return None;
        }

        let value = unsafe { &*storage.as_ptr().cast::<UNICODE_STRING>() };
        let byte_length = usize::from(value.Length);
        if byte_length == 0 || !byte_length.is_multiple_of(2) || value.Buffer.is_null() {
            return None;
        }

        let storage_start = storage.as_ptr() as usize;
        let storage_end = storage_start.checked_add(storage.len().checked_mul(word_size)?)?;
        let string_start = value.Buffer.0 as usize;
        let string_end = string_start.checked_add(byte_length)?;
        if string_start < storage_start || string_end > storage_end {
            return None;
        }

        let units = unsafe { std::slice::from_raw_parts(value.Buffer.0, byte_length / 2) };
        let command_line = String::from_utf16_lossy(units);
        (!command_line.trim().is_empty()).then_some(command_line)
    }

    fn query_memory(handle: HANDLE) -> Option<u64> {
        let mut counters = PROCESS_MEMORY_COUNTERS {
            cb: std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
            ..PROCESS_MEMORY_COUNTERS::default()
        };
        unsafe {
            GetProcessMemoryInfo(
                handle,
                &mut counters,
                std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
            )
        }
        .ok()?;
        Some(counters.WorkingSetSize as u64)
    }

    fn query_timing(handle: HANDLE) -> Option<ProcessTiming> {
        let mut creation = FILETIME::default();
        let mut exit = FILETIME::default();
        let mut kernel = FILETIME::default();
        let mut user = FILETIME::default();
        unsafe { GetProcessTimes(handle, &mut creation, &mut exit, &mut kernel, &mut user) }.ok()?;

        Some(ProcessTiming {
            creation_ticks: filetime_ticks(creation.dwHighDateTime, creation.dwLowDateTime),
            cpu_ticks: filetime_ticks(kernel.dwHighDateTime, kernel.dwLowDateTime)
                .saturating_add(filetime_ticks(user.dwHighDateTime, user.dwLowDateTime)),
        })
    }
}

#[cfg(not(windows))]
mod platform {
    use super::ProcessMetadata;

    pub(super) fn inspect_process(_pid: u32) -> ProcessMetadata {
        ProcessMetadata::default()
    }
}

#[cfg(test)]
mod tests {
    use super::{filetime_ticks, filetime_to_unix_ms, WINDOWS_TO_UNIX_EPOCH_100NS};

    #[test]
    fn combines_filetime_words() {
        assert_eq!(filetime_ticks(0x0123_4567, 0x89ab_cdef), 0x0123_4567_89ab_cdef);
    }

    #[test]
    fn converts_windows_filetime_to_unix_milliseconds() {
        assert_eq!(filetime_to_unix_ms(WINDOWS_TO_UNIX_EPOCH_100NS), Some(0));
        assert_eq!(
            filetime_to_unix_ms(WINDOWS_TO_UNIX_EPOCH_100NS + 12_340_000),
            Some(1_234)
        );
        assert_eq!(filetime_to_unix_ms(WINDOWS_TO_UNIX_EPOCH_100NS - 1), None);
    }
}
