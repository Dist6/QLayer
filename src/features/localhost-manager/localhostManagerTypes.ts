export type LocalhostServerClassification = "development" | "unknown";
export type DevelopmentServerKind = "frontend" | "backend" | "fullStack" | "unknown";
export type LocalhostBinding = "loopback" | "allInterfaces";
export type ProjectNameSource = "automatic" | "manual";

export type LocalhostServer = {
  id: string;
  displayAddress: string;
  url: string | null;
  port: number;
  isRunning: boolean;
  processName: string | null;
  memoryBytes: number | null;
  startedAtMs: number | null;
  uptimeSeconds: number | null;
  cpuPercent: number | null;
  projectId: string | null;
  projectName: string | null;
  projectNameSource: ProjectNameSource | null;
  classification: LocalhostServerClassification;
  kind: DevelopmentServerKind;
  binding: LocalhostBinding;
};

export type LocalhostSnapshot = {
  servers: LocalhostServer[];
  hasLimitedProcessAccess: boolean;
};

export function parseLocalhostSnapshot(value: unknown): LocalhostSnapshot {
  if (!isRecord(value) || !Array.isArray(value.servers)) {
    throw new Error("Local development servers returned invalid data.");
  }
  if (typeof value.hasLimitedProcessAccess !== "boolean") {
    throw new Error("Local development servers returned invalid data.");
  }

  return {
    servers: value.servers.map(parseLocalhostServer),
    hasLimitedProcessAccess: value.hasLimitedProcessAccess,
  };
}

function parseLocalhostServer(value: unknown): LocalhostServer {
  if (!isRecord(value)) throw invalidData();

  const port = readInteger(value.port, 1, 65_535);
  const classification = readEnum(value.classification, ["development", "unknown"] as const);
  const expectedAddress = `localhost:${port}`;
  const expectedUrl = `http://localhost:${port}`;

  if (
    !isNonEmptyString(value.id) ||
    value.displayAddress !== expectedAddress ||
    typeof value.isRunning !== "boolean"
  ) {
    throw invalidData();
  }

  const url = readNullableString(value.url);
  if (
    (classification === "development" && url !== expectedUrl) ||
    (classification === "unknown" && url !== null)
  ) {
    throw invalidData();
  }
  const projectId = readNullableString(value.projectId);
  const projectName = readNullableString(value.projectName);
  const projectNameSource = readNullableEnum(value.projectNameSource, [
    "automatic",
    "manual",
  ] as const);
  if ((projectName === null) !== (projectNameSource === null)) {
    throw invalidData();
  }

  return {
    id: value.id,
    displayAddress: expectedAddress,
    url,
    port,
    isRunning: value.isRunning,
    processName: readNullableString(value.processName),
    memoryBytes: readNullableNumber(value.memoryBytes, 0),
    startedAtMs: readNullableNumber(value.startedAtMs, 0),
    uptimeSeconds: readNullableNumber(value.uptimeSeconds, 0),
    cpuPercent: readNullableNumber(value.cpuPercent, 0, 100),
    projectId,
    projectName,
    projectNameSource,
    classification,
    kind: readEnum(value.kind, ["frontend", "backend", "fullStack", "unknown"] as const),
    binding: readEnum(value.binding, ["loopback", "allInterfaces"] as const),
  };
}

function readInteger(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw invalidData();
  }
  return value;
}

function readNullableNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw invalidData();
  }
  return value;
}

function readNullableString(value: unknown): string | null {
  if (value === null) return null;
  if (!isNonEmptyString(value)) throw invalidData();
  return value;
}

function readEnum<const T extends readonly string[]>(value: unknown, allowed: T): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw invalidData();
  return value as T[number];
}

function readNullableEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  if (value === null) return null;
  return readEnum(value, allowed);
}

function invalidData(): Error {
  return new Error("Local development servers returned invalid data.");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
