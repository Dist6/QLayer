import type { ChatDestination } from "../chat-shortcuts/chatDestinationTypes";
import type { VoiceSelectorSelection } from "../chat-shortcuts/voiceSelectorEvents";
import type { Project } from "../projects/projectTypes";

export type VoiceDestinationPhase = "idle" | "selecting" | "starting" | "listening";

export function beginVoiceDestinationFlow(hasSavedDestinations: boolean): VoiceDestinationPhase {
  return hasSavedDestinations ? "selecting" : "starting";
}

export function consumeVoiceDestinationSelection(phase: VoiceDestinationPhase): {
  accepted: boolean;
  phase: VoiceDestinationPhase;
} {
  return phase === "selecting" ? { accepted: true, phase: "starting" } : { accepted: false, phase };
}

export function releaseVoiceDestinationFlow(phase: VoiceDestinationPhase): {
  cancelledSelection: boolean;
  phase: VoiceDestinationPhase;
} {
  return { cancelledSelection: phase === "selecting", phase: "idle" };
}

export function resolveVoiceDestination(
  destinations: readonly ChatDestination[],
  projects: readonly Project[],
  selection: VoiceSelectorSelection,
): { kind: "current" } | { kind: "saved"; threadId: string } | null {
  if (selection.kind === "current") {
    return { kind: "current" };
  }
  if (selection.kind === "projectChat") {
    const linked = projects.some((project) =>
      project.linkedChats.some((chat) => chat.threadId === selection.threadId),
    );
    return linked ? { kind: "saved", threadId: selection.threadId } : null;
  }
  const destination = destinations.find((candidate) => candidate.id === selection.destinationId);
  return destination ? { kind: "saved", threadId: destination.threadId } : null;
}
