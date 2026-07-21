import { IconPencil } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { captureGlobalHotkey, getShortcutKeycaps } from "./globalHotkeyShortcut";

export type GlobalHotkeyChangeResult = { ok: true } | { ok: false; message: string };

type GlobalHotkeyRecorderProps = {
  shortcut: string;
  onChange: (shortcut: string) => Promise<GlobalHotkeyChangeResult>;
  onRecordingChange?: (recording: boolean) => void;
};

export function GlobalHotkeyRecorder({
  shortcut,
  onChange,
  onRecordingChange,
}: GlobalHotkeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const setRecordingState = (next: boolean) => {
    setRecording(next);
    onRecordingChange?.(next);
  };

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const captured = captureGlobalHotkey(event);
      if (!captured.ok) {
        if (captured.reason === "cancelled") {
          setMessage(undefined);
          setRecordingState(false);
        } else if (captured.reason === "invalid") {
          setMessage(captured.message);
        }
        return;
      }

      setMessage(undefined);
      setRecordingState(false);
      setSaving(true);
      void onChange(captured.shortcut).then((result) => {
        setSaving(false);
        if (!result.ok) setMessage(result.message);
      });
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onChange, recording]);

  return (
    <div className="hotkey-recorder">
      <div className="shortcut-keycaps" aria-label={shortcut}>
        {recording ? (
          <span className="recording-prompt">Press a shortcut</span>
        ) : (
          getShortcutKeycaps(shortcut).map((key, index) => (
            <span className="keycap-pair" key={`${key}-${index}`}>
              {index > 0 ? <span aria-hidden="true">+</span> : null}
              <kbd className={key === "Space" ? "keycap keycap-wide" : "keycap"}>{key}</kbd>
            </span>
          ))
        )}
      </div>
      <button
        aria-label={recording ? "Cancel shortcut recording" : "Edit Voice Flow shortcut"}
        aria-pressed={recording}
        className="shortcut-edit"
        disabled={saving}
        onClick={() => {
          setMessage(undefined);
          setRecordingState(!recording);
        }}
        title={recording ? "Cancel recording" : "Edit shortcut"}
        type="button"
      >
        <IconPencil aria-hidden="true" size={17} stroke={1.7} />
      </button>
      {recording ? <span className="recorder-hint">Esc to cancel</span> : null}
      {message ? (
        <span aria-live="polite" className="recorder-message" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
