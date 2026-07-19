use serde::Serialize;
use std::sync::Mutex;
use tauri::Manager;

const MIN_LISTENING_VOLUME_PERCENT: u8 = 5;
const MAX_LISTENING_VOLUME_PERCENT: u8 = 50;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioStep {
    status: &'static str,
    message: &'static str,
}

#[derive(Clone, Debug, PartialEq)]
struct SavedAudioState {
    volume: f32,
    muted: bool,
}

#[derive(Default)]
pub struct AudioState {
    saved: Mutex<Option<SavedAudioState>>,
}

impl AudioState {
    fn save_once(&self, next: SavedAudioState) -> Result<(), &'static str> {
        self.saved
            .lock()
            .map(|mut saved| {
                if saved.is_none() {
                    *saved = Some(next);
                }
            })
            .map_err(|_| "Audio control failed.")
    }

    fn take(&self) -> Result<Option<SavedAudioState>, &'static str> {
        self.saved
            .lock()
            .map(|mut saved| saved.take())
            .map_err(|_| "Audio control failed.")
    }
}

pub fn prepare_audio(
    app: tauri::AppHandle,
    mode: String,
    listening_volume_percent: u8,
) -> Result<AudioStep, String> {
    match mode.as_str() {
        "duck" => duck_audio(app, listening_volume_scalar(listening_volume_percent)?),
        "mute" => mute_audio(app),
        "disabled" => Ok(AudioStep {
            status: "audioDisabled",
            message: "Audio unchanged.",
        }),
        _ => Err("Audio control failed.".to_string()),
    }
}

pub fn restore_audio(app: tauri::AppHandle) -> Result<AudioStep, String> {
    let Some(saved) = app
        .state::<AudioState>()
        .take()
        .map_err(|message: &'static str| message.to_string())?
    else {
        return Ok(AudioStep {
            status: "nothingToRestore",
            message: "Nothing to restore.",
        });
    };

    match platform::set_audio_state(saved.volume, saved.muted) {
        Ok(()) => Ok(AudioStep {
            status: "restored",
            message: "Audio restored.",
        }),
        Err(message) => Err(message.to_string()),
    }
}

fn duck_audio(app: tauri::AppHandle, listening_volume: f32) -> Result<AudioStep, String> {
    let current = platform::read_audio_state().map_err(|message| message.to_string())?;
    let temporary_volume = current.volume.min(listening_volume);
    let muted = current.muted;
    app.state::<AudioState>()
        .save_once(current)
        .map_err(|message: &'static str| message.to_string())?;
    platform::set_audio_state(temporary_volume, muted).map_err(|message| message.to_string())?;

    Ok(AudioStep {
        status: "audioDucked",
        message: "Audio lowered.",
    })
}

fn listening_volume_scalar(percent: u8) -> Result<f32, String> {
    if !(MIN_LISTENING_VOLUME_PERCENT..=MAX_LISTENING_VOLUME_PERCENT).contains(&percent) {
        return Err("Listening volume must be between 5 and 50 percent.".to_string());
    }

    Ok(f32::from(percent) / 100.0)
}

fn mute_audio(app: tauri::AppHandle) -> Result<AudioStep, String> {
    let current = platform::read_audio_state().map_err(|message| message.to_string())?;
    let volume = current.volume;
    app.state::<AudioState>()
        .save_once(current)
        .map_err(|message: &'static str| message.to_string())?;
    platform::set_audio_state(volume, true).map_err(|message| message.to_string())?;

    Ok(AudioStep {
        status: "audioMuted",
        message: "Audio muted.",
    })
}

#[cfg(windows)]
mod platform {
    use super::SavedAudioState;
    use windows::core::GUID;
    use windows::Win32::Foundation::RPC_E_CHANGED_MODE;
    use windows::Win32::Media::Audio::{
        eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator,
    };
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    pub fn read_audio_state() -> Result<SavedAudioState, &'static str> {
        with_endpoint(|endpoint| {
            let volume = unsafe { endpoint.GetMasterVolumeLevelScalar() }
                .map_err(|_| "Audio control is not available.")?;
            let muted = unsafe { endpoint.GetMute() }
                .map_err(|_| "Audio control is not available.")?
                .as_bool();

            Ok(SavedAudioState { volume, muted })
        })
    }

    pub fn set_audio_state(volume: f32, muted: bool) -> Result<(), &'static str> {
        with_endpoint(|endpoint| {
            let event_context: *const GUID = std::ptr::null();
            unsafe {
                endpoint
                    .SetMasterVolumeLevelScalar(volume.clamp(0.0, 1.0), event_context)
                    .map_err(|_| "Audio control failed.")?;
                endpoint
                    .SetMute(muted, event_context)
                    .map_err(|_| "Audio control failed.")?;
            }

            Ok(())
        })
    }

    fn with_endpoint<T>(
        action: impl FnOnce(&IAudioEndpointVolume) -> Result<T, &'static str>,
    ) -> Result<T, &'static str> {
        let _com = ComGuard::initialize()?;
        let enumerator: IMMDeviceEnumerator =
            unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
                .map_err(|_| "Audio control is not available.")?;
        let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
            .map_err(|_| "Audio control is not available.")?;
        let endpoint: IAudioEndpointVolume = unsafe { device.Activate(CLSCTX_ALL, None) }
            .map_err(|_| "Audio control is not available.")?;

        action(&endpoint)
    }

    struct ComGuard;

    impl ComGuard {
        fn initialize() -> Result<Option<Self>, &'static str> {
            let result = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
            if result == RPC_E_CHANGED_MODE {
                return Ok(None);
            }

            if result.is_err() {
                return Err("Audio control is not available.");
            }

            Ok(Some(Self))
        }
    }

    impl Drop for ComGuard {
        fn drop(&mut self) {
            unsafe {
                CoUninitialize();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{listening_volume_scalar, AudioState, SavedAudioState};

    #[test]
    fn preserves_the_first_audio_state_until_restore() {
        let state = AudioState::default();
        let original = SavedAudioState {
            volume: 0.8,
            muted: false,
        };

        state.save_once(original.clone()).unwrap();
        state
            .save_once(SavedAudioState {
                volume: 0.2,
                muted: true,
            })
            .unwrap();

        assert_eq!(state.take().unwrap(), Some(original));
    }

    #[test]
    fn converts_supported_listening_volumes() {
        assert_eq!(listening_volume_scalar(5).unwrap(), 0.05);
        assert_eq!(listening_volume_scalar(20).unwrap(), 0.2);
        assert_eq!(listening_volume_scalar(50).unwrap(), 0.5);
    }

    #[test]
    fn rejects_unsupported_listening_volumes() {
        assert!(listening_volume_scalar(4).is_err());
        assert!(listening_volume_scalar(51).is_err());
    }
}

#[cfg(not(windows))]
mod platform {
    use super::SavedAudioState;

    pub fn read_audio_state() -> Result<SavedAudioState, &'static str> {
        Err("Audio control is not available.")
    }

    pub fn set_audio_state(_volume: f32, _muted: bool) -> Result<(), &'static str> {
        Err("Audio control is not available.")
    }
}
