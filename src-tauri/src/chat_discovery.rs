use serde::Serialize;
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{self, Receiver};
use std::time::{Duration, Instant};

const DISCOVERY_ERROR: &str = "Recent chats are unavailable.";
const DISCOVERY_LIMIT: usize = 20;
const DISCOVERY_TIMEOUT: Duration = Duration::from_secs(4);

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentChat {
    thread_id: String,
    title: String,
    project_id: Option<String>,
    project_name: Option<String>,
    updated_at: Option<String>,
}

pub fn list_recent_chats(runtime: &Path) -> Result<Vec<RecentChat>, String> {
    let mut child = spawn_app_server(runtime).map_err(|_| DISCOVERY_ERROR.to_string())?;
    let result = exchange_requests(&mut child);
    let _ = child.kill();
    let _ = child.wait();
    result.map_err(|_| DISCOVERY_ERROR.to_string())
}

fn exchange_requests(child: &mut Child) -> Result<Vec<RecentChat>, ()> {
    let mut stdin = child.stdin.take().ok_or(())?;
    let stdout = child.stdout.take().ok_or(())?;
    let (sender, receiver) = mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            if sender.send(line).is_err() {
                break;
            }
        }
    });

    let deadline = Instant::now() + DISCOVERY_TIMEOUT;
    write_json_line(
        &mut stdin,
        &json!({
            "id": 1,
            "method": "initialize",
            "params": {
                "clientInfo": { "name": "qolayer", "title": "QoLayer", "version": "0.1.0" },
                "capabilities": { "experimentalApi": false }
            }
        }),
    )?;
    wait_for_response(&receiver, 1, deadline)?;
    write_json_line(
        &mut stdin,
        &json!({ "method": "initialized", "params": {} }),
    )?;
    write_json_line(
        &mut stdin,
        &json!({
            "id": 2,
            "method": "thread/list",
            "params": {
                "limit": DISCOVERY_LIMIT,
                "sortKey": "updated_at",
                "sortDirection": "desc",
                "archived": false,
                "useStateDbOnly": true
            }
        }),
    )?;

    let response = wait_for_response(&receiver, 2, deadline)?;
    parse_thread_list_response(&response).ok_or(())
}

fn write_json_line(stdin: &mut impl Write, value: &Value) -> Result<(), ()> {
    serde_json::to_writer(&mut *stdin, value).map_err(|_| ())?;
    stdin.write_all(b"\n").map_err(|_| ())?;
    stdin.flush().map_err(|_| ())
}

fn wait_for_response(
    receiver: &Receiver<std::io::Result<String>>,
    id: i64,
    deadline: Instant,
) -> Result<Value, ()> {
    loop {
        let remaining = deadline.checked_duration_since(Instant::now()).ok_or(())?;
        let line = receiver
            .recv_timeout(remaining)
            .map_err(|_| ())?
            .map_err(|_| ())?;
        let value: Value = serde_json::from_str(&line).map_err(|_| ())?;
        if value.get("id").and_then(Value::as_i64) == Some(id) {
            return value.get("result").cloned().ok_or(());
        }
    }
}

fn parse_thread_list_response(result: &Value) -> Option<Vec<RecentChat>> {
    let data = result.get("data")?.as_array()?;
    let mut chats: Vec<RecentChat> = data.iter().filter_map(parse_recent_chat).collect();
    chats.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    chats.truncate(DISCOVERY_LIMIT);
    Some(chats)
}

fn parse_recent_chat(value: &Value) -> Option<RecentChat> {
    let thread_id = crate::codex_threads::parse_thread_id(value.get("id")?.as_str()?).ok()?;
    let title = value
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or("Untitled chat")
        .chars()
        .take(80)
        .collect();
    let project_root = value
        .get("cwd")
        .and_then(Value::as_str)
        .map(PathBuf::from)
        .filter(|path| path.is_absolute());
    let project_id = project_root
        .as_deref()
        .map(crate::localhost_manager::project_fingerprint);
    let project_name = project_root
        .as_deref()
        .and_then(Path::file_name)
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.is_empty());
    let updated_at = value
        .get("updatedAt")
        .and_then(Value::as_i64)
        .map(|timestamp| timestamp.to_string());

    Some(RecentChat {
        thread_id,
        title,
        project_id,
        project_name,
        updated_at,
    })
}

fn spawn_app_server(runtime: &Path) -> std::io::Result<Child> {
    let mut command = Command::new(runtime);
    command
        .arg("app-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }

    command.spawn()
}

#[cfg(test)]
mod tests {
    use super::parse_thread_list_response;
    use serde_json::json;

    #[test]
    fn parses_only_metadata_and_drops_malformed_siblings() {
        let response = json!({
            "data": [
                {
                    "id": "019f72d8-d02e-75d1-9969-d6c5a647c95e",
                    "name": " QoLayer selector ",
                    "cwd": "C:\\Users\\example\\QoLayer",
                    "updatedAt": 200,
                    "preview": "ignored private content",
                    "turns": [{ "items": [{ "text": "ignored" }] }]
                },
                { "id": "not-a-thread", "name": "Invalid", "updatedAt": 300 },
                {
                    "id": "019f72d8-d02e-75d1-9969-d6c5a647c95f",
                    "name": null,
                    "cwd": null,
                    "updatedAt": 100
                }
            ]
        });

        let chats = parse_thread_list_response(&response).expect("valid list");
        assert_eq!(chats.len(), 2);
        assert_eq!(chats[0].title, "QoLayer selector");
        assert_eq!(chats[0].project_name.as_deref(), Some("QoLayer"));
        assert!(chats[0].project_id.as_deref().is_some_and(|id| id.starts_with("project-")));
        assert_eq!(chats[1].title, "Untitled chat");
        assert_eq!(chats[1].project_id, None);
    }

    #[test]
    fn rejects_missing_data() {
        assert!(parse_thread_list_response(&json!({})).is_none());
    }
}
