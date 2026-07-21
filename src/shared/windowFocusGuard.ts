let suspensionCount = 0;

export function isWindowDismissSuspended(): boolean {
  return suspensionCount > 0;
}

export async function withWindowDismissSuspended<T>(action: () => Promise<T>): Promise<T> {
  suspensionCount += 1;
  try {
    return await action();
  } finally {
    suspensionCount = Math.max(0, suspensionCount - 1);
  }
}
