"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ScheduleType = "hour" | "6h" | "day" | "week" | "month" | "cron";
export type MonitorStatus = "active" | "paused";
export type DestinationType =
  "email" | "telegram" | "discord" | "slack" | "webhook" | "wecom" | "feishu";
export type DestinationConfig = {
  type: DestinationType;
  value: string;
  enabled: boolean;
};
export type SourceSetting = { apiKey?: string; baseUrl?: string };
export type FindingRecord = {
  id: string;
  monitorId: string;
  title: string;
  url: string;
  source: string;
  fetchedAt: string;
  publishedAt: string;
  updatedAt?: string;
  keywords: string[];
  authors: string[];
  institutions: string[];
  subjects: string[];
  abstract?: string;
  category?: string;
  citation?: string;
  doi?: string;
  version?: string;
};
export type ExecutionRecord = {
  id: string;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "partial" | "failed";
  scanned: number;
  findings: number;
  errors: string[];
};

export type MonitorDraft = {
  name: string;
  description: string;
  schedule: ScheduleType;
  runTime: string;
  weekday: string;
  monthDay: string;
  cron: string;
  timezone: string;
  runImmediately: boolean;
  sourceIds: string[];
  customSourceUrls: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  useRegex: boolean;
  publishedWithin: "1d" | "3d" | "7d" | "30d";
  matchMode: "any" | "all";
  language: "all" | "zh" | "en";
  maxResults: number;
  deduplicate: boolean;
  destinations: string[];
  destinationValue: string;
  destinationConfigs: DestinationConfig[];
};

export type MonitorRecord = MonitorDraft & {
  id: string;
  status: MonitorStatus;
  createdAt: string;
};

type VectorState = {
  monitors: MonitorRecord[];
  connectedSourceIds: string[];
  findings: FindingRecord[];
  executions: ExecutionRecord[];
  sourceSettings: Record<string, SourceSetting>;
  scheduledRunKeys: Record<string, string>;
};

type StoreValue = VectorState & {
  hydrated: boolean;
  addMonitor: (draft: MonitorDraft) => MonitorRecord;
  toggleMonitor: (id: string) => void;
  deleteMonitor: (id: string) => void;
  updateKeywords: (
    id: string,
    includeKeywords: string[],
    excludeKeywords: string[],
    useRegex: boolean,
  ) => void;
  updateDestinations: (
    id: string,
    destinationConfigs: DestinationConfig[],
  ) => void;
  toggleSource: (id: string) => void;
  updateSourceSetting: (id: string, setting: SourceSetting) => void;
  executeMonitor: (id: string) => Promise<ExecutionRecord>;
};

const STORAGE_KEY = "vector.workspace.v1";
const initialState: VectorState = {
  monitors: [],
  connectedSourceIds: [],
  findings: [],
  executions: [],
  sourceSettings: {},
  scheduledRunKeys: {},
};
const VectorContext = createContext<StoreValue | null>(null);

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const weekdayName =
    parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      weekdayName,
    ),
  };
}

function cronFieldMatches(
  field: string,
  value: number,
  min: number,
  max: number,
) {
  return field.split(",").some((part) => {
    const [rangePart, stepPart] = part.split("/");
    const step = Math.max(1, Number(stepPart) || 1);
    const [start, end] =
      rangePart === "*"
        ? [min, max]
        : rangePart.includes("-")
          ? rangePart.split("-").map(Number)
          : [Number(rangePart), Number(rangePart)];
    return (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      value >= start &&
      value <= end &&
      (value - start) % step === 0
    );
  });
}

function scheduledRunKey(monitor: MonitorRecord, now: Date) {
  let parts: ZonedParts;
  try {
    parts = zonedParts(now, monitor.timezone || "UTC");
  } catch {
    parts = zonedParts(now, "UTC");
  }
  const [runHour, runMinute] = monitor.runTime.split(":").map(Number);
  let due = false;
  if (monitor.schedule === "hour") due = parts.minute === runMinute;
  else if (monitor.schedule === "6h")
    due = parts.minute === runMinute && (parts.hour - runHour + 24) % 6 === 0;
  else if (monitor.schedule === "day")
    due = parts.hour === runHour && parts.minute === runMinute;
  else if (monitor.schedule === "week")
    due =
      parts.weekday === Number(monitor.weekday) &&
      parts.hour === runHour &&
      parts.minute === runMinute;
  else if (monitor.schedule === "month")
    due =
      parts.day === Number(monitor.monthDay) &&
      parts.hour === runHour &&
      parts.minute === runMinute;
  else if (monitor.schedule === "cron") {
    const fields = monitor.cron.trim().split(/\s+/);
    due =
      fields.length === 5 &&
      cronFieldMatches(fields[0], parts.minute, 0, 59) &&
      cronFieldMatches(fields[1], parts.hour, 0, 23) &&
      cronFieldMatches(fields[2], parts.day, 1, 31) &&
      cronFieldMatches(fields[3], parts.month, 1, 12) &&
      cronFieldMatches(fields[4], parts.weekday, 0, 6);
  }
  if (!due) return null;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}@${monitor.timezone}`;
}

function latestScheduledRunKey(monitor: MonitorRecord, now: Date) {
  const createdAt = new Date(monitor.createdAt).getTime();
  const currentMinute = new Date(now);
  currentMinute.setSeconds(0, 0);
  if (monitor.schedule === "cron") {
    for (let offset = 0; offset <= 10080; offset++) {
      const candidate = new Date(currentMinute.getTime() - offset * 60000);
      if (candidate.getTime() < createdAt) break;
      const key = scheduledRunKey(monitor, candidate);
      if (key) return key;
    }
    return null;
  }
  let parts: ZonedParts;
  try {
    parts = zonedParts(currentMinute, monitor.timezone || "UTC");
  } catch {
    parts = zonedParts(currentMinute, "UTC");
  }
  const [runHour, runMinute] = monitor.runTime.split(":").map(Number);
  const currentTime = parts.hour * 60 + parts.minute;
  const targetTime = runHour * 60 + runMinute;
  let offset = 0;
  if (monitor.schedule === "hour")
    offset = (parts.minute - runMinute + 60) % 60;
  else if (monitor.schedule === "6h") {
    for (offset = 0; offset < 360; offset++)
      if (
        scheduledRunKey(
          monitor,
          new Date(currentMinute.getTime() - offset * 60000),
        )
      )
        break;
  } else if (monitor.schedule === "day")
    offset = (currentTime - targetTime + 1440) % 1440;
  else if (monitor.schedule === "week")
    offset =
      ((parts.weekday - Number(monitor.weekday)) * 1440 +
        currentTime -
        targetTime +
        10080) %
      10080;
  else if (monitor.schedule === "month") {
    const targetDay = Number(monitor.monthDay);
    let targetYear = parts.year;
    let targetMonth = parts.month;
    if (
      parts.day < targetDay ||
      (parts.day === targetDay && currentTime < targetTime)
    ) {
      targetMonth--;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear--;
      }
    }
    const days = Math.round(
      (Date.UTC(parts.year, parts.month - 1, parts.day) -
        Date.UTC(targetYear, targetMonth - 1, targetDay)) /
        86400000,
    );
    offset = days * 1440 + currentTime - targetTime;
  }
  const candidate = new Date(currentMinute.getTime() - offset * 60000);
  for (let adjustment = -120; adjustment <= 120; adjustment++) {
    const adjusted = new Date(candidate.getTime() + adjustment * 60000);
    if (
      adjusted.getTime() > currentMinute.getTime() ||
      adjusted.getTime() < createdAt
    )
      continue;
    const key = scheduledRunKey(monitor, adjusted);
    if (key) return key;
  }
  if (candidate.getTime() >= createdAt) {
    const key = scheduledRunKey(monitor, candidate);
    if (key) return key;
  }
  return null;
}

export function VectorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VectorState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const runningMonitorIds = useRef(new Set<string>());
  const lastSchedulerCheckAt = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<VectorState>;
        setState({
          monitors: Array.isArray(parsed.monitors)
            ? parsed.monitors.map((monitor) => ({
                ...monitor,
                destinationConfigs: Array.isArray(monitor.destinationConfigs)
                  ? monitor.destinationConfigs
                  : [],
              }))
            : [],
          connectedSourceIds: Array.isArray(parsed.connectedSourceIds)
            ? parsed.connectedSourceIds.filter((id) => id !== "rsshub")
            : [],
          findings: Array.isArray(parsed.findings)
            ? parsed.findings.map((finding) => ({
                ...finding,
                fetchedAt:
                  typeof finding.fetchedAt === "string"
                    ? finding.fetchedAt
                    : new Date().toISOString(),
                updatedAt:
                  typeof finding.updatedAt === "string"
                    ? finding.updatedAt
                    : undefined,
                abstract:
                  typeof finding.abstract === "string"
                    ? finding.abstract
                    : undefined,
                category:
                  typeof finding.category === "string"
                    ? finding.category
                    : undefined,
                citation:
                  typeof finding.citation === "string"
                    ? finding.citation
                    : undefined,
                doi: typeof finding.doi === "string" ? finding.doi : undefined,
                version:
                  typeof finding.version === "string"
                    ? finding.version
                    : undefined,
                authors: Array.isArray(finding.authors) ? finding.authors : [],
                institutions: Array.isArray(finding.institutions)
                  ? finding.institutions
                  : [],
                subjects: Array.isArray(finding.subjects)
                  ? finding.subjects
                  : [],
                keywords: Array.isArray(finding.keywords)
                  ? finding.keywords
                  : [],
              }))
            : [],
          executions: Array.isArray(parsed.executions) ? parsed.executions : [],
          sourceSettings:
            parsed.sourceSettings && typeof parsed.sourceSettings === "object"
              ? parsed.sourceSettings
              : {},
          scheduledRunKeys:
            parsed.scheduledRunKeys &&
            typeof parsed.scheduledRunKeys === "object"
              ? parsed.scheduledRunKeys
              : {},
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    const runDueMonitors = async () => {
      const now = new Date();
      const catchUp =
        lastSchedulerCheckAt.current === 0 ||
        now.getTime() - lastSchedulerCheckAt.current > 90000;
      lastSchedulerCheckAt.current = now.getTime();
      for (const monitor of state.monitors) {
        if (
          monitor.status !== "active" ||
          runningMonitorIds.current.has(monitor.id)
        )
          continue;
        const immediateKey = `created:${monitor.createdAt}`;
        const key =
          monitor.runImmediately &&
          !state.executions.some((item) => item.monitorId === monitor.id)
            ? immediateKey
            : catchUp
              ? latestScheduledRunKey(monitor, now)
              : scheduledRunKey(monitor, now);
        if (!key || state.scheduledRunKeys[monitor.id] === key) continue;
        runningMonitorIds.current.add(monitor.id);
        setState((current) => ({
          ...current,
          scheduledRunKeys: { ...current.scheduledRunKeys, [monitor.id]: key },
        }));
        try {
          const sourceIds = [
            ...new Set([...monitor.sourceIds, ...state.connectedSourceIds]),
          ];
          const response = await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...monitor,
              sourceIds,
              sourceSettings: state.sourceSettings,
            }),
          });
          const result = (await response.json()) as {
            execution?: ExecutionRecord;
            findings?: FindingRecord[];
            error?: string;
          };
          if (!response.ok || !result.execution || !result.findings)
            throw new Error(result.error || "Scheduled execution failed");
          setState((current) => ({
            ...current,
            executions: [result.execution!, ...current.executions],
            findings: [
              ...result.findings!,
              ...current.findings.filter(
                (old) => !result.findings!.some((item) => item.id === old.id),
              ),
            ],
          }));
        } catch (error) {
          const finishedAt = new Date().toISOString();
          setState((current) => ({
            ...current,
            executions: [
              {
                id: createId(),
                monitorId: monitor.id,
                monitorName: monitor.name,
                startedAt: finishedAt,
                finishedAt,
                status: "failed",
                scanned: 0,
                findings: 0,
                errors: [
                  error instanceof Error
                    ? error.message
                    : "Scheduled execution failed",
                ],
              },
              ...current.executions,
            ],
          }));
        } finally {
          runningMonitorIds.current.delete(monitor.id);
        }
      }
    };
    void runDueMonitors();
    const timer = window.setInterval(() => void runDueMonitors(), 15000);
    return () => window.clearInterval(timer);
  }, [
    hydrated,
    state.connectedSourceIds,
    state.executions,
    state.monitors,
    state.scheduledRunKeys,
    state.sourceSettings,
  ]);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,
      addMonitor: (draft) => {
        const now = new Date().toISOString();
        const monitor: MonitorRecord = {
          ...draft,
          id: createId(),
          status: "active",
          createdAt: now,
        };
        setState((current) => ({
          ...current,
          monitors: [monitor, ...current.monitors],
          connectedSourceIds: [
            ...new Set([...current.connectedSourceIds, ...draft.sourceIds]),
          ],
        }));
        return monitor;
      },
      toggleMonitor: (id) =>
        setState((current) => ({
          ...current,
          monitors: current.monitors.map((monitor) =>
            monitor.id === id
              ? {
                  ...monitor,
                  status: monitor.status === "active" ? "paused" : "active",
                }
              : monitor,
          ),
        })),
      deleteMonitor: (id) =>
        setState((current) => ({
          ...current,
          monitors: current.monitors.filter((monitor) => monitor.id !== id),
        })),
      updateKeywords: (id, includeKeywords, excludeKeywords, useRegex) =>
        setState((current) => ({
          ...current,
          monitors: current.monitors.map((monitor) =>
            monitor.id === id
              ? { ...monitor, includeKeywords, excludeKeywords, useRegex }
              : monitor,
          ),
        })),
      updateDestinations: (id, destinationConfigs) =>
        setState((current) => ({
          ...current,
          monitors: current.monitors.map((monitor) =>
            monitor.id === id
              ? {
                  ...monitor,
                  destinationConfigs,
                  destinations: destinationConfigs
                    .filter((item) => item.enabled)
                    .map((item) => item.type),
                  destinationValue: "",
                }
              : monitor,
          ),
        })),
      toggleSource: (id) =>
        setState((current) => ({
          ...current,
          connectedSourceIds: current.connectedSourceIds.includes(id)
            ? current.connectedSourceIds.filter((sourceId) => sourceId !== id)
            : [...current.connectedSourceIds, id],
        })),
      updateSourceSetting: (id, setting) =>
        setState((current) => ({
          ...current,
          sourceSettings: { ...current.sourceSettings, [id]: setting },
        })),
      executeMonitor: async (id) => {
        const monitor = state.monitors.find((item) => item.id === id);
        if (!monitor) throw new Error("Monitor not found");
        const sourceIds = [
          ...new Set([...monitor.sourceIds, ...state.connectedSourceIds]),
        ];
        const response = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...monitor,
            sourceIds,
            sourceSettings: state.sourceSettings,
          }),
        });
        const result = (await response.json()) as {
          execution: ExecutionRecord;
          findings: FindingRecord[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "Execution failed");
        setState((current) => ({
          ...current,
          executions: [result.execution, ...current.executions],
          findings: [
            ...result.findings,
            ...current.findings.filter(
              (old) => !result.findings.some((item) => item.id === old.id),
            ),
          ],
        }));
        return result.execution;
      },
    }),
    [hydrated, state],
  );

  return (
    <VectorContext.Provider value={value}>{children}</VectorContext.Provider>
  );
}

export function useVectorStore() {
  const value = useContext(VectorContext);
  if (!value)
    throw new Error("useVectorStore must be used inside VectorProvider");
  return value;
}
