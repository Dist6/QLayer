use std::collections::{HashMap, HashSet};

const MAX_PARENT_DEPTH: usize = 4;

pub(crate) fn discover_parent_map() -> HashMap<u32, u32> {
    platform::discover_parent_map().unwrap_or_default()
}

pub(crate) fn process_chain(pid: u32, parents: &HashMap<u32, u32>) -> Vec<u32> {
    let mut chain = vec![pid];
    let mut visited = HashSet::from([pid]);
    let mut current = pid;
    for _ in 0..MAX_PARENT_DEPTH {
        let Some(parent) = parents.get(&current).copied() else { break };
        if parent == 0 || !visited.insert(parent) { break }
        chain.push(parent);
        current = parent;
    }
    chain
}

#[cfg(windows)]
mod platform {
    use std::collections::HashMap;
    use std::mem::size_of;
    use windows::Win32::Foundation::{CloseHandle, HANDLE};
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };

    struct Snapshot(HANDLE);
    impl Drop for Snapshot {
        fn drop(&mut self) { unsafe { let _ = CloseHandle(self.0); } }
    }

    pub(super) fn discover_parent_map() -> Option<HashMap<u32, u32>> {
        let snapshot = Snapshot(unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }.ok()?);
        let mut entry = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..PROCESSENTRY32W::default()
        };
        unsafe { Process32FirstW(snapshot.0, &mut entry) }.ok()?;
        let mut parents = HashMap::new();
        loop {
            parents.insert(entry.th32ProcessID, entry.th32ParentProcessID);
            if unsafe { Process32NextW(snapshot.0, &mut entry) }.is_err() { break }
        }
        Some(parents)
    }
}

#[cfg(not(windows))]
mod platform {
    use std::collections::HashMap;
    pub(super) fn discover_parent_map() -> Option<HashMap<u32, u32>> { None }
}

#[cfg(test)]
mod tests {
    use super::process_chain;
    use std::collections::HashMap;

    #[test]
    fn bounds_parent_chains_and_stops_cycles() {
        let parents = HashMap::from([(10, 9), (9, 8), (8, 7), (7, 6), (6, 5)]);
        assert_eq!(process_chain(10, &parents), vec![10, 9, 8, 7, 6]);
        let cyclic = HashMap::from([(10, 9), (9, 10)]);
        assert_eq!(process_chain(10, &cyclic), vec![10, 9]);
    }

    #[test]
    fn tolerates_missing_parent_metadata() {
        assert_eq!(process_chain(42, &HashMap::new()), vec![42]);
    }
}
