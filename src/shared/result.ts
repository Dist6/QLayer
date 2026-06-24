export type AppResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "failed" | "notImplemented"; message: string };

export const notImplemented = (message: string): AppResult<never> => ({
  ok: false,
  reason: "notImplemented",
  message,
});

export const failed = (message: string): AppResult<never> => ({
  ok: false,
  reason: "failed",
  message,
});
