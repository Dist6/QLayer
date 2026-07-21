# OpenAI Build Week Development

QLayer is an existing project that was meaningfully extended during the OpenAI Build Week submission period. This document separates prior work from the work eligible for evaluation.

## Project before Build Week

Before the submission period, QLayer had:

- A Tauri, React, TypeScript, Vite, and Rust desktop foundation.
- An early compact tray utility interface.
- Initial global shortcut registration.
- Initial Windows audio lower, mute, and restore commands.
- An early Codex focus and dictation prototype.

The prototype did not yet provide saved chat destinations, recent-chat discovery, a destination selector, Localhost Manager, Projects, or the final release-ready interface and packaging.

## Built or significantly extended during Build Week

Work completed during the submission period includes:

- A compact, polished Quick Tools interface and refined Windows tray behavior.
- Saved Chat Shortcuts with defensive local persistence.
- Recent Codex chat discovery using a narrow local App Server integration.
- A Voice Flow destination selector with individual Chat and Project modes.
- Validated Codex thread deep links and fail-closed destination routing.
- Localhost Manager with Windows listener discovery, development-server classification, project identification, resource visibility, uptime, and visibility-aware refresh behavior.
- Projects with local folders, linked chats, preferred ports, port verification, and predefined Start Development and Stop Development messages.
- Safe Project action delivery to a user-selected chat, with clipboard fallback.
- UI, window placement, icon, performance, and release-readiness improvements.
- Portable Windows release packaging and public-project documentation.

## How Codex was used

Codex supported:

- Architecture and implementation planning.
- React and TypeScript feature development.
- Native Rust and Windows API integration.
- Debugging Codex and ChatGPT focus and dictation behavior.
- Test creation and regression checks.
- UI iteration, performance review, privacy review, and release preparation.

## How GPT-5.6 was used

GPT-5.6 supported reasoning about:

- The push-to-talk lifecycle and safe keyboard release behavior.
- Windows focus, tray, audio, listener, and process-inspection boundaries.
- Fail-closed automation and minimum-permission native commands.
- Localhost classification and project association.
- Product structure, interaction design, and release scope.

The product direction, feature approvals, safety constraints, and final decisions remained human-directed.

## Evidence

| Commit                   | Date       | Work                                                                                      |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------------- |
| `d4433be`                | 2026-07-18 | Completed the compact Voice Flow toolbox                                                  |
| `02a873a`?`73b91f0`      | 2026-07-18 | Added validated chat destinations, discovery, selection, and Voice Flow routing           |
| `f0f827e`                | 2026-07-20 | Completed the Quick Tools foundation, including Localhost Manager work                    |
| `a7a286f`?`f82b28f`      | 2026-07-20 | Added Projects, linked chats and servers, safe actions, and Project-based voice selection |
| `v0.1.0` release history | 2026-07-21 | Release polish, optimization, portable packaging, documentation, and validation           |

The primary Codex Build Week task should be submitted using the required `/feedback` Session ID. The repository history and dated Codex sessions provide the detailed record.
