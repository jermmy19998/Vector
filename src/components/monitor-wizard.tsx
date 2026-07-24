"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Plus,
  Search,
  X,
} from "lucide-react";
import { providers } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n";
import {
  useVectorStore,
  type MonitorDraft,
  type ScheduleType,
} from "./vector-store";
import { Button, LoadingButton } from "./ui";
import { VectorLogo } from "./vector-logo";

type Props = { close: () => void; onComplete: () => void };
const field =
  "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500";
const selectField =
  "h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-300 outline-none focus:border-indigo-500";
const zhSteps = [
  "基本信息",
  "执行时间",
  "来源",
  "关键词",
  "过滤规则",
  "通知方式",
];
const enSteps = [
  "Basics",
  "Schedule",
  "Sources",
  "Keywords",
  "Filters",
  "Delivery",
];

export function MonitorWizard({ close, onComplete }: Props) {
  const { language } = useI18n();
  const { addMonitor, connectedSourceIds } = useVectorStore();
  const q = (zh: string, en: string) => (language === "zh" ? zh : en);
  const steps = language === "zh" ? zhSteps : enSteps;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<MonitorDraft>({
    name: "",
    description: "",
    schedule: "6h",
    runTime: "09:00",
    weekday: "1",
    monthDay: "1",
    cron: "0 9 * * *",
    timezone: "Asia/Shanghai",
    runImmediately: true,
    sourceIds: connectedSourceIds,
    customSourceUrls: [],
    includeKeywords: [],
    excludeKeywords: [],
    useRegex: false,
    publishedWithin: "7d",
    matchMode: "any",
    language: "all",
    maxResults: 50,
    deduplicate: true,
    destinations: [],
    destinationValue: "",
    destinationConfigs: [],
  });
  const update = <K extends keyof MonitorDraft>(
    key: K,
    value: MonitorDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const validateStep = () => {
    if (step === 0 && !draft.name.trim())
      return q("请输入监控器名称。", "Enter a monitor name.");
    if (
      step === 1 &&
      draft.schedule === "cron" &&
      !/^\s*\S+(\s+\S+){4}\s*$/.test(draft.cron)
    )
      return q(
        "请输入有效的 5 段 Cron 表达式。",
        "Enter a valid five-part Cron expression.",
      );
    if (
      step === 2 &&
      draft.sourceIds.length === 0 &&
      draft.customSourceUrls.length === 0
    )
      return q("请至少选择一个来源。", "Select at least one source.");
    if (step === 3 && draft.includeKeywords.length === 0)
      return q(
        "请至少添加一个包含关键词。",
        "Add at least one include keyword.",
      );
    if (
      step === 5 &&
      draft.destinations.length > 0 &&
      !draft.destinationValue.trim()
    )
      return q(
        "请填写所选通知方式的接收地址。",
        "Enter a destination address for the selected channel.",
      );
    return "";
  };
  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step < 5) {
      setStep((current) => current + 1);
      return;
    }
    setSaving(true);
    addMonitor({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#09090b]">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-[#0c0c0e] p-6 lg:block">
        <button
          onClick={close}
          className="mb-10 flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <ArrowLeft size={14} />
          {q("返回监控器", "Back to monitors")}
        </button>
        <div className="mb-7 flex items-center gap-2">
          <VectorLogo size={29} />
          <span className="text-sm font-semibold">
            {q("新建监控器", "New monitor")}
          </span>
        </div>
        {steps.map((label, index) => (
          <button
            key={label}
            onClick={() => {
              if (index <= step) {
                setStep(index);
                setError("");
              }
            }}
            className={cn(
              "flex w-full items-center gap-3 py-3 text-left text-xs",
              index === step ? "text-zinc-100" : "text-zinc-500",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 text-[10px]">
              {index < step ? <Check size={11} /> : index + 1}
            </span>
            {label}
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
          <div className="text-xs text-zinc-500">
            {q(`第 ${step + 1} 步`, `Step ${step + 1}`)} · {steps[step]}
          </div>
          <button
            aria-label={q("关闭", "Close")}
            onClick={close}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"
          >
            <X size={17} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-12">
            <WizardStep step={step} draft={draft} update={update} />
            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {error}
              </div>
            )}
          </div>
        </main>
        <footer className="flex min-h-16 items-center justify-between gap-3 border-t border-zinc-800 px-5">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => {
              setStep((current) => current - 1);
              setError("");
            }}
          >
            <ArrowLeft size={14} />
            {q("上一步", "Back")}
          </Button>
          <LoadingButton loading={saving} onClick={next}>
            {step === 5
              ? q("创建监控器", "Create monitor")
              : q("继续", "Continue")}
            {!saving &&
              (step === 5 ? <Check size={14} /> : <ArrowRight size={14} />)}
          </LoadingButton>
        </footer>
      </div>
    </div>
  );
}

function Intro({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
    </div>
  );
}

function TagEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const additions = input
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (additions.length) onChange([...new Set([...values, ...additions])]);
    setInput("");
  };
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="mt-2 min-h-24 rounded-xl border border-zinc-700 p-3 focus-within:border-indigo-500">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300"
            >
              {value}
              <button
                aria-label={`Remove ${value}`}
                className="ml-2 rounded hover:text-white"
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onBlur={add}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="min-w-44 flex-1 bg-transparent py-1 text-xs outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>
    </div>
  );
}

function WizardStep({
  step,
  draft,
  update,
}: {
  step: number;
  draft: MonitorDraft;
  update: <K extends keyof MonitorDraft>(
    key: K,
    value: MonitorDraft[K],
  ) => void;
}) {
  const { language } = useI18n();
  const { toggleSource } = useVectorStore();
  const q = (zh: string, en: string) => (language === "zh" ? zh : en);
  const [sourceQuery, setSourceQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const visibleProviders = useMemo(
    () =>
      providers.filter((provider) =>
        `${provider.name} ${provider.description}`
          .toLowerCase()
          .includes(sourceQuery.toLowerCase()),
      ),
    [sourceQuery],
  );

  if (step === 0)
    return (
      <>
        <Intro
          title={q("监控什么内容？", "What should Vector monitor?")}
          body={q(
            "为自动化任务设置清晰的名称和说明。",
            "Give this automation a clear name and context.",
          )}
        />
        <label className="text-xs text-zinc-400">
          {q("监控器名称", "Monitor name")}
        </label>
        <input
          autoFocus
          value={draft.name}
          onChange={(event) => update("name", event.target.value)}
          className={cn(field, "mt-2")}
          placeholder={q(
            "例如：医疗影像基础模型",
            "e.g. Medical imaging models",
          )}
        />
        <label className="mt-6 block text-xs text-zinc-400">
          {q("描述（可选）", "Description (optional)")}
        </label>
        <textarea
          value={draft.description}
          onChange={(event) => update("description", event.target.value)}
          className="mt-2 min-h-28 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500"
          placeholder={q("说明监控目标和用途", "Describe the monitoring goal")}
        />
      </>
    );

  if (step === 1) {
    const options: [ScheduleType, string][] = [
      ["hour", q("每小时", "Every hour")],
      ["6h", q("每 6 小时", "Every 6 hours")],
      ["day", q("每天", "Daily")],
      ["week", q("每周", "Weekly")],
      ["month", q("每月", "Monthly")],
      ["cron", "Cron"],
    ];
    return (
      <>
        <Intro
          title={q("什么时候执行？", "When should it run?")}
          body={q(
            "Vector 会在后台按设置的周期执行。",
            "Vector runs in the background on your schedule.",
          )}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => update("schedule", value)}
              className={cn(
                "rounded-xl border p-4 text-left transition hover:border-zinc-600",
                draft.schedule === value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/40",
              )}
            >
              <Clock3
                size={16}
                className={
                  draft.schedule === value ? "text-indigo-400" : "text-zinc-600"
                }
              />
              <div className="mt-5 text-xs">{label}</div>
              {draft.schedule === value && (
                <CheckCircle2
                  size={13}
                  className="float-right -mt-4 text-indigo-400"
                />
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          {(draft.schedule === "hour" || draft.schedule === "6h") && (
            <TimeRow
              title={q("开始时间", "Start time")}
              value={draft.runTime}
              onChange={(value) => update("runTime", value)}
              note={q(
                "从这个时间点开始计算执行间隔",
                "Intervals begin from this time",
              )}
            />
          )}
          {draft.schedule === "day" && (
            <TimeRow
              title={q("每天执行时间", "Run every day at")}
              value={draft.runTime}
              onChange={(value) => update("runTime", value)}
            />
          )}
          {draft.schedule === "week" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium">
                {q("每周执行", "Run weekly")}
              </span>
              <div className="flex gap-2">
                <select
                  value={draft.weekday}
                  onChange={(event) => update("weekday", event.target.value)}
                  className={selectField}
                >
                  {[
                    ["1", "周一", "Monday"],
                    ["2", "周二", "Tuesday"],
                    ["3", "周三", "Wednesday"],
                    ["4", "周四", "Thursday"],
                    ["5", "周五", "Friday"],
                    ["6", "周六", "Saturday"],
                    ["0", "周日", "Sunday"],
                  ].map(([value, zh, en]) => (
                    <option key={value} value={value}>
                      {q(zh, en)}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={draft.runTime}
                  onChange={(event) => update("runTime", event.target.value)}
                  className={selectField}
                />
              </div>
            </div>
          )}
          {draft.schedule === "month" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium">
                {q("每月执行", "Run monthly")}
              </span>
              <div className="flex gap-2">
                <select
                  value={draft.monthDay}
                  onChange={(event) => update("monthDay", event.target.value)}
                  className={selectField}
                >
                  {Array.from({ length: 28 }, (_, index) => (
                    <option key={index + 1} value={String(index + 1)}>
                      {q(`${index + 1} 日`, `Day ${index + 1}`)}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={draft.runTime}
                  onChange={(event) => update("runTime", event.target.value)}
                  className={selectField}
                />
              </div>
            </div>
          )}
          {draft.schedule === "cron" && (
            <div>
              <label className="text-xs text-zinc-400">Cron</label>
              <input
                value={draft.cron}
                onChange={(event) => update("cron", event.target.value)}
                className={cn(field, "mt-2 font-mono")}
              />
              <div className="mt-2 text-[10px] text-zinc-600">
                {q(
                  "5 段格式，例如每天 09:00：0 9 * * *",
                  "Five-part format, e.g. daily at 09:00: 0 9 * * *",
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div>
            <div className="text-xs font-medium">
              {q("创建后立即执行", "Run immediately after creation")}
            </div>
            <div className="mt-1 text-[10px] text-zinc-600">
              {q(
                "默认请求立即运行一次，之后按设定时间执行",
                "Requests one immediate run, then follows the schedule",
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.runImmediately}
            onClick={() => update("runImmediately", !draft.runImmediately)}
            className={cn(
              "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
              draft.runImmediately ? "bg-indigo-500" : "bg-zinc-700",
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full bg-white transition-transform",
                draft.runImmediately && "translate-x-4",
              )}
            />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 p-4">
          <span className="text-xs">{q("时区", "Timezone")}</span>
          <div className="relative">
            <select
              value={draft.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              className="h-9 appearance-none rounded-lg border border-zinc-700 bg-zinc-900 py-0 pl-3 pr-8 text-xs text-zinc-300 outline-none focus:border-indigo-500"
            >
              <option>Asia/Shanghai</option>
              <option>Asia/Tokyo</option>
              <option>Europe/London</option>
              <option>America/New_York</option>
              <option>UTC</option>
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-3 text-zinc-500"
            />
          </div>
        </div>
      </>
    );
  }

  if (step === 2) {
    const addUrl = () => {
      try {
        const url = new URL(customUrl);
        if (!/^https?:$/.test(url.protocol)) return;
        update("customSourceUrls", [
          ...new Set([...draft.customSourceUrls, url.toString()]),
        ]);
        setCustomUrl("");
      } catch {
        return;
      }
    };
    return (
      <>
        <Intro
          title={q("选择来源", "Choose source providers")}
          body={q(
            "此处与主界面的来源连接状态实时同步。",
            "Selections here stay synchronized with Sources.",
          )}
        />
        <div className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-zinc-800 px-3">
          <Search size={14} />
          <input
            value={sourceQuery}
            onChange={(event) => setSourceQuery(event.target.value)}
            className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-600"
            placeholder={q("搜索来源...", "Search providers...")}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleProviders.map((provider) => {
            const active = draft.sourceIds.includes(provider.id);
            return (
              <button
                key={provider.id}
                onClick={() => {
                  update(
                    "sourceIds",
                    active
                      ? draft.sourceIds.filter((id) => id !== provider.id)
                      : [...draft.sourceIds, provider.id],
                  );
                  toggleSource(provider.id);
                }}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left",
                  active
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                  <provider.icon size={16} style={{ color: provider.color }} />
                </div>
                <span className="min-w-0 flex-1 truncate text-xs">
                  {provider.name}
                </span>
                {active && (
                  <CheckCircle2 size={14} className="text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
        {visibleProviders.length === 0 && (
          <p className="py-8 text-center text-xs text-zinc-600">
            {q("没有匹配的来源", "No matching providers")}
          </p>
        )}
        <div className="mt-5 rounded-xl border border-zinc-800 p-4">
          <label className="text-xs text-zinc-400">
            {q("自定义 RSS / Atom URL", "Custom RSS / Atom URL")}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addUrl();
                }
              }}
              className={field}
              placeholder="https://example.com/feed.xml"
            />
            <Button variant="secondary" onClick={addUrl}>
              <Plus size={14} />
              {q("添加", "Add")}
            </Button>
          </div>
          {draft.customSourceUrls.map((url) => (
            <div
              key={url}
              className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-[11px] text-zinc-400"
            >
              <span className="min-w-0 flex-1 truncate">{url}</span>
              <button
                onClick={() =>
                  update(
                    "customSourceUrls",
                    draft.customSourceUrls.filter((item) => item !== url),
                  )
                }
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (step === 3)
    return (
      <>
        <Intro
          title={q("定义关键词", "Define keywords")}
          body={q(
            "只有符合关键词规则的内容才会进入发现列表。",
            "Only content matching these rules enters Findings.",
          )}
        />
        <div className="space-y-6">
          <TagEditor
            label={q("包含关键词", "Include keywords")}
            values={draft.includeKeywords}
            onChange={(value) => update("includeKeywords", value)}
            placeholder={q("输入后按 Enter", "Type and press Enter")}
          />
          <TagEditor
            label={q("排除关键词", "Exclude keywords")}
            values={draft.excludeKeywords}
            onChange={(value) => update("excludeKeywords", value)}
            placeholder={q("输入后按 Enter", "Type and press Enter")}
          />
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 p-4 text-xs">
            <span>
              <span className="block font-medium">
                {q("使用正则表达式", "Use regular expressions")}
              </span>
              <span className="mt-1 block text-[10px] text-zinc-600">
                {q(
                  "将关键词按 Regex 规则匹配",
                  "Interpret keywords as Regex patterns",
                )}
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.useRegex}
              onChange={(event) => update("useRegex", event.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>
        </div>
      </>
    );

  if (step === 4)
    return (
      <>
        <Intro
          title={q("细化结果", "Refine results")}
          body={q(
            "设置时间范围、匹配方式、语言和数量上限。",
            "Control freshness, matching, language and volume.",
          )}
        />
        <div className="space-y-4">
          <SelectRow
            label={q("发布时间", "Published within")}
            value={draft.publishedWithin}
            onChange={(value) =>
              update(
                "publishedWithin",
                value as MonitorDraft["publishedWithin"],
              )
            }
            options={[
              ["1d", q("最近一天", "Last day")],
              ["3d", q("最近三天", "Last 3 days")],
              ["7d", q("最近七天", "Last 7 days")],
              ["30d", q("最近一个月", "Last 30 days")],
            ]}
          />
          <SelectRow
            label={q("关键词匹配", "Keyword matching")}
            value={draft.matchMode}
            onChange={(value) =>
              update("matchMode", value as MonitorDraft["matchMode"])
            }
            options={[
              ["any", q("匹配任意", "Match any")],
              ["all", q("匹配全部", "Match all")],
            ]}
          />
          <SelectRow
            label={q("语言", "Language")}
            value={draft.language}
            onChange={(value) =>
              update("language", value as MonitorDraft["language"])
            }
            options={[
              ["all", q("全部语言", "All languages")],
              ["zh", q("仅中文", "Chinese only")],
              ["en", q("仅英文", "English only")],
            ]}
          />
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 p-4 text-xs">
            <span>{q("最多返回数量", "Maximum results")}</span>
            <input
              type="number"
              min={1}
              max={500}
              value={draft.maxResults}
              onChange={(event) =>
                update(
                  "maxResults",
                  Math.min(500, Math.max(1, Number(event.target.value) || 1)),
                )
              }
              className="h-9 w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-right outline-none focus:border-indigo-500"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 p-4 text-xs">
            <span>{q("自动去重", "Deduplicate results")}</span>
            <input
              type="checkbox"
              checked={draft.deduplicate}
              onChange={(event) => update("deduplicate", event.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>
        </div>
      </>
    );

  const channels = [
    "Telegram",
    "Discord",
    "Slack",
    "Webhook",
    q("企业微信", "WeCom"),
    q("飞书", "Feishu"),
  ];
  return (
    <>
      <Intro
        title={q("通知发送到哪里？", "Where should findings go?")}
        body={q(
          "通知渠道是可选项；选择后请填写对应地址。",
          "Delivery is optional; enter an address after selecting a channel.",
        )}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {channels.map((channel) => {
          const active = draft.destinations.includes(channel);
          return (
            <button
              key={channel}
              onClick={() =>
                update(
                  "destinations",
                  active
                    ? draft.destinations.filter((item) => item !== channel)
                    : [...draft.destinations, channel],
                )
              }
              className={cn(
                "rounded-xl border p-4 text-left transition",
                active
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600",
              )}
            >
              <div className="text-xs">{channel}</div>
              <div className="mt-2 text-[10px] text-zinc-600">
                {active ? q("已选择", "Selected") : q("未选择", "Not selected")}
              </div>
            </button>
          );
        })}
      </div>
      {draft.destinations.length > 0 && (
        <div className="mt-5">
          <label className="text-xs text-zinc-400">
            {q("接收地址 / Webhook URL", "Recipient / Webhook URL")}
          </label>
          <input
            value={draft.destinationValue}
            onChange={(event) => update("destinationValue", event.target.value)}
            className={cn(field, "mt-2")}
            placeholder={q(
              "频道标识或完整 URL",
              "Channel identifier or full URL",
            )}
          />
          <p className="mt-2 text-[10px] text-zinc-600">
            {q(
              "Vector 只保存配置；未完成渠道认证前不会显示已连接。",
              "Vector stores this configuration without claiming the channel is connected.",
            )}
          </p>
        </div>
      )}
    </>
  );
}

function TimeRow({
  title,
  value,
  onChange,
  note,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs font-medium">{title}</div>
        {note && <div className="mt-1 text-[10px] text-zinc-600">{note}</div>}
      </div>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectField}
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 p-4 text-xs">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectField}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
