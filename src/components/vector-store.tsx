"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ScheduleType = "hour" | "6h" | "day" | "week" | "month" | "cron";
export type MonitorStatus = "active" | "paused";
export type DestinationType = "email" | "telegram" | "discord" | "slack" | "webhook" | "wecom" | "feishu";
export type DestinationConfig = { type: DestinationType; value: string; enabled: boolean };
export type FindingRecord = { id:string; monitorId:string; title:string; url:string; source:string; fetchedAt:string; publishedAt:string; updatedAt?:string; keywords:string[]; authors:string[]; institutions:string[]; subjects:string[]; abstract?:string; category?:string; citation?:string; doi?:string; version?:string };
export type ExecutionRecord = { id:string; monitorId:string; monitorName:string; startedAt:string; finishedAt:string; status:"success"|"partial"|"failed"; scanned:number; findings:number; errors:string[] };

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
};

type StoreValue = VectorState & {
  hydrated: boolean;
  addMonitor: (draft: MonitorDraft) => MonitorRecord;
  toggleMonitor: (id: string) => void;
  deleteMonitor: (id: string) => void;
  updateKeywords: (id: string, includeKeywords: string[], excludeKeywords: string[], useRegex: boolean) => void;
  updateDestinations: (id: string, destinationConfigs: DestinationConfig[]) => void;
  toggleSource: (id: string) => void;
  executeMonitor: (id: string) => Promise<ExecutionRecord>;
};

const STORAGE_KEY = "vector.workspace.v1";
const initialState: VectorState = { monitors: [], connectedSourceIds: [], findings: [], executions: [] };
const VectorContext = createContext<StoreValue | null>(null);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function VectorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VectorState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<VectorState>;
        // Loading persisted external state is the intended one-time synchronization here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          monitors: Array.isArray(parsed.monitors) ? parsed.monitors.map((monitor) => ({
            ...monitor,
            destinationConfigs: Array.isArray(monitor.destinationConfigs) ? monitor.destinationConfigs : [],
          })) : [],
          connectedSourceIds: Array.isArray(parsed.connectedSourceIds) ? parsed.connectedSourceIds : [],
          findings: Array.isArray(parsed.findings) ? parsed.findings.map((finding) => ({
            ...finding,
            fetchedAt: typeof finding.fetchedAt === "string" ? finding.fetchedAt : new Date().toISOString(),
            updatedAt: typeof finding.updatedAt === "string" ? finding.updatedAt : undefined,
            abstract: typeof finding.abstract === "string" ? finding.abstract : undefined,
            category: typeof finding.category === "string" ? finding.category : undefined,
            citation: typeof finding.citation === "string" ? finding.citation : undefined,
            doi: typeof finding.doi === "string" ? finding.doi : undefined,
            version: typeof finding.version === "string" ? finding.version : undefined,
            authors: Array.isArray(finding.authors) ? finding.authors : [],
            institutions: Array.isArray(finding.institutions) ? finding.institutions : [],
            subjects: Array.isArray(finding.subjects) ? finding.subjects : [],
            keywords: Array.isArray(finding.keywords) ? finding.keywords : [],
          })) : [],
          executions: Array.isArray(parsed.executions) ? parsed.executions : [],
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

  const value = useMemo<StoreValue>(() => ({
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
      setState((current) => ({ ...current, monitors: [monitor, ...current.monitors] }));
      return monitor;
    },
    toggleMonitor: (id) => setState((current) => ({
      ...current,
      monitors: current.monitors.map((monitor) => monitor.id === id
        ? { ...monitor, status: monitor.status === "active" ? "paused" : "active" }
        : monitor),
    })),
    deleteMonitor: (id) => setState((current) => ({
      ...current,
      monitors: current.monitors.filter((monitor) => monitor.id !== id),
    })),
    updateKeywords: (id, includeKeywords, excludeKeywords, useRegex) => setState((current) => ({
      ...current,
      monitors: current.monitors.map((monitor) => monitor.id === id
        ? { ...monitor, includeKeywords, excludeKeywords, useRegex }
        : monitor),
    })),
    updateDestinations: (id, destinationConfigs) => setState((current) => ({
      ...current,
      monitors: current.monitors.map((monitor) => monitor.id === id
        ? { ...monitor, destinationConfigs, destinations: destinationConfigs.filter((item) => item.enabled).map((item) => item.type), destinationValue: "" }
        : monitor),
    })),
    toggleSource: (id) => setState((current) => ({
      ...current,
      connectedSourceIds: current.connectedSourceIds.includes(id)
        ? current.connectedSourceIds.filter((sourceId) => sourceId !== id)
        : [...current.connectedSourceIds, id],
    })),
    executeMonitor: async (id) => {
      const monitor = state.monitors.find((item) => item.id === id);
      if (!monitor) throw new Error("Monitor not found");
      const sourceIds = [...new Set([...monitor.sourceIds, ...state.connectedSourceIds])];
      const response = await fetch("/api/execute", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...monitor, sourceIds }) });
      const result = await response.json() as { execution:ExecutionRecord; findings:FindingRecord[]; error?:string };
      if (!response.ok) throw new Error(result.error || "Execution failed");
      setState((current) => ({ ...current, executions:[result.execution,...current.executions], findings:[...result.findings,...current.findings.filter((old)=>!result.findings.some((item)=>item.id===old.id))] }));
      return result.execution;
    },
  }), [hydrated, state]);

  return <VectorContext.Provider value={value}>{children}</VectorContext.Provider>;
}

export function useVectorStore() {
  const value = useContext(VectorContext);
  if (!value) throw new Error("useVectorStore must be used inside VectorProvider");
  return value;
}
