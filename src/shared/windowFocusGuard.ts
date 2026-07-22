let suspensionCount = 0;

export function isWindowDismissSuspended(): boolean {
  return suspensionCount > 0;
}

export function suspendWindowDismiss(): () => void {
  let active = true;
  suspensionCount += 1;

  return () => {
    if (!active) return;
    active = false;
    suspensionCount = Math.max(0, suspensionCount - 1);
  };
}

export async function withWindowDismissSuspended<T>(action: () => Promise<T>): Promise<T> {
  const release = suspendWindowDismiss();
  try {
    return await action();
  } finally {
    release();
  }
}
