import { IconArrowLeft, IconCheck, IconMessages } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import type { Project, ProjectDevelopmentAction } from "./projectTypes";

type ProjectActionDialogProps = {
  action: ProjectDevelopmentAction;
  project: Project;
  busy: boolean;
  message?: string;
  fallbackText?: string;
  onCancel: () => void;
  onConfirm: (threadId: string) => void;
};

export function ProjectActionDialog({
  action,
  project,
  busy,
  message,
  fallbackText,
  onCancel,
  onConfirm,
}: ProjectActionDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [threadId, setThreadId] = useState(
    project.lastSelectedChatId ?? project.linkedChats[0]?.threadId ?? "",
  );

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const title = action === "startDevelopment" ? "Start Development" : "Stop Development";

  return (
    <dialog className="project-action-dialog" onCancel={busy ? undefined : onCancel} ref={ref}>
      <header>
        <button aria-label={`Cancel ${title}`} disabled={busy} onClick={onCancel} type="button">
          <IconArrowLeft aria-hidden="true" size={19} stroke={1.7} />
        </button>
        <div>
          <h2>{title}</h2>
          <span>Choose a chat for this action</span>
        </div>
      </header>

      <div className="project-action-chat-list" role="radiogroup" aria-label="Linked chats">
        {project.linkedChats.map((chat) => (
          <button
            aria-checked={threadId === chat.threadId}
            disabled={busy}
            key={chat.threadId}
            onClick={() => setThreadId(chat.threadId)}
            role="radio"
            type="button"
          >
            <IconMessages aria-hidden="true" size={18} stroke={1.6} />
            <strong>{chat.displayName}</strong>
            {threadId === chat.threadId ? (
              <IconCheck aria-hidden="true" size={18} stroke={1.9} />
            ) : null}
          </button>
        ))}
      </div>

      {message ? (
        <p className="project-action-message" role="status">
          {message}
        </p>
      ) : null}
      {fallbackText ? (
        <textarea aria-label="Project action message" readOnly rows={6} value={fallbackText} />
      ) : null}

      <footer>
        <button disabled={busy} onClick={onCancel} type="button">
          Cancel
        </button>
        <button disabled={busy || !threadId} onClick={() => onConfirm(threadId)} type="button">
          {busy ? "Working…" : title}
        </button>
      </footer>
    </dialog>
  );
}
