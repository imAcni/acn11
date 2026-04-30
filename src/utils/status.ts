import { createClient, type EdgeConfigValue } from "@vercel/edge-config";

type RawStatus = Record<string, EdgeConfigValue>;

export type StatusType = "info" | "success" | "warning" | "error";

export type StatusLinkPart = {
  type: "link";
  text: string;
  href: string;
};

export type StatusTextPart = {
  type: "text";
  text: string;
};

export type StatusEntry = {
  message: string;
  type: StatusType;
  updatedAt: Date | null;
  parts: Array<StatusLinkPart | StatusTextPart>;
};

export type StatusData = {
  current: StatusEntry | null;
  history: StatusEntry[];
  unavailable: boolean;
};

const STATUS_KEYS = ["motd", "statusHistory", "motdHistory", "statuses"];
const STATUS_TYPES = new Set<StatusType>([
  "info",
  "success",
  "warning",
  "error",
]);
const urlPattern = /https?:\/\/[^\s<>"']+/g;

const isRecord = (value: EdgeConfigValue | undefined): value is RawStatus =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asString = (value: EdgeConfigValue | undefined) =>
  typeof value === "string" ? value.trim() : "";

const asStatusType = (value: EdgeConfigValue | undefined): StatusType => {
  const type = asString(value).toLowerCase();
  return STATUS_TYPES.has(type as StatusType) ? (type as StatusType) : "info";
};

const asDate = (value: EdgeConfigValue | undefined) => {
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const getStatusParts = (message: string): StatusEntry["parts"] => {
  const parts: StatusEntry["parts"] = [];
  let previousIndex = 0;

  for (const match of message.matchAll(urlPattern)) {
    const href = match[0];
    const index = match.index ?? 0;
    const trailingPunctuation = href.match(/[),.!?;:]+$/)?.[0] ?? "";
    const cleanHref = trailingPunctuation
      ? href.slice(0, -trailingPunctuation.length)
      : href;

    if (index > previousIndex) {
      parts.push({ type: "text", text: message.slice(previousIndex, index) });
    }

    parts.push({ type: "link", text: cleanHref, href: cleanHref });

    if (trailingPunctuation) {
      parts.push({ type: "text", text: trailingPunctuation });
    }

    previousIndex = index + href.length;
  }

  if (previousIndex < message.length) {
    parts.push({ type: "text", text: message.slice(previousIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: message }];
};

const normalizeStatus = (
  value: EdgeConfigValue | undefined,
  requireEnabled = false
): StatusEntry | null => {
  if (!isRecord(value)) return null;
  if (requireEnabled && value.enabled !== true) return null;

  const message = asString(value.message);
  if (!message) return null;

  const updatedAt =
    asDate(value.updatedAt) ??
    asDate(value.updated_at) ??
    asDate(value.createdAt) ??
    asDate(value.created_at) ??
    asDate(value.date);

  return {
    message,
    type: asStatusType(value.type),
    updatedAt,
    parts: getStatusParts(message),
  };
};

const normalizeHistory = (value: EdgeConfigValue | undefined) => {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => normalizeStatus(entry))
    .filter((entry): entry is StatusEntry => Boolean(entry));
};

const dedupeStatuses = (statuses: StatusEntry[]) => {
  const seen = new Set<string>();

  return statuses.filter(status => {
    const key = `${status.message}:${status.updatedAt?.toISOString() ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getStatusData = async (): Promise<StatusData> => {
  if (!process.env.EDGE_CONFIG) {
    return { current: null, history: [], unavailable: true };
  }

  try {
    const edgeConfig = createClient(process.env.EDGE_CONFIG, {
      disableDevelopmentCache: true,
    });
    const items =
      await edgeConfig.getAll<Record<string, EdgeConfigValue>>(STATUS_KEYS);

    const current = normalizeStatus(items.motd, true);
    const historySource =
      items.statusHistory ?? items.motdHistory ?? items.statuses;
    const history = normalizeHistory(historySource);

    return {
      current,
      history: dedupeStatuses([...(current ? [current] : []), ...history]),
      unavailable: false,
    };
  } catch {
    return { current: null, history: [], unavailable: true };
  }
};

export const getStatusTypeClass = (type: StatusType) =>
  ({
    info: "text-sky-200",
    success: "text-emerald-200",
    warning: "text-yellow-200",
    error: "text-red-200",
  })[type];
