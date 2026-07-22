"use client";
import { motion } from "framer-motion";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ children, variant="primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?:"primary"|"secondary"|"ghost"|"danger" }) {
  return <motion.button whileTap={{scale:.97}} className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50", variant==="primary"&&"bg-indigo-500 text-white shadow-[0_0_0_1px_rgba(255,255,255,.08)_inset] hover:bg-indigo-400", variant==="secondary"&&"border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800", variant==="ghost"&&"text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100", variant==="danger"&&"bg-red-500/10 text-red-400 hover:bg-red-500/20", className)} {...(props as any)}>{children}</motion.button>;
}

export function Badge({children, tone="neutral"}:{children:React.ReactNode; tone?:"neutral"|"success"|"warning"|"indigo"}) {
  const c={neutral:"border-zinc-700 bg-zinc-800/60 text-zinc-400",success:"border-emerald-500/20 bg-emerald-500/10 text-emerald-400",warning:"border-amber-500/20 bg-amber-500/10 text-amber-400",indigo:"border-indigo-500/20 bg-indigo-500/10 text-indigo-300"}[tone];
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",c)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, description, action }:{eyebrow?:string;title:string;description:string;action?:React.ReactNode}) {
  return <div className="mb-7 flex items-end justify-between gap-6"><div>{eyebrow&&<div className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-indigo-400">{eyebrow}</div>}<h1 className="text-[25px] font-semibold tracking-[-.03em] text-zinc-50">{title}</h1><p className="mt-1 text-sm text-zinc-500">{description}</p></div>{action}</div>;
}

export function Metric({label,value,change,icon:Icon,tone="indigo"}:{label:string;value:string;change:string;icon:LucideIcon;tone?:string}) {
  return <div className="panel panel-hover p-4.5"><div className="flex items-start justify-between"><div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", tone==="green"?"border-emerald-500/15 bg-emerald-500/10 text-emerald-400":tone==="amber"?"border-amber-500/15 bg-amber-500/10 text-amber-400":"border-indigo-500/15 bg-indigo-500/10 text-indigo-400")}><Icon size={15}/></div><span className="text-[11px] text-zinc-600">{change}</span></div><div className="mt-5 text-2xl font-semibold tracking-[-.04em]">{value}</div><div className="mt-1 text-xs text-zinc-500">{label}</div></div>;
}

export function EmptyState({icon:Icon,title,body,action}:{icon:LucideIcon;title:string;body:string;action?:React.ReactNode}) { return <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500"><Icon size={19}/></div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1.5 max-w-xs text-xs leading-5 text-zinc-500">{body}</p>{action&&<div className="mt-5">{action}</div>}</div> }

export function LoadingButton({loading,children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{loading:boolean}) { return <Button disabled={loading} {...props}>{loading&&<LoaderCircle size={14} className="animate-spin"/>}{children}</Button> }
