"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bell, Boxes, Building2, ChevronDown, CircleGauge, Clock3, Command, FileSearch, Inbox, KeyRound, MonitorDot, Search, Settings, Webhook, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";
import { useI18n } from "./i18n";
import { VectorLogo } from "./vector-logo";
import { findings } from "@/lib/data";

export type View = "overview"|"monitors"|"sources"|"findings"|"keywords"|"destinations"|"history"|"settings"|"about";
const primary = [
  {id:"overview",label:"Overview",icon:CircleGauge},{id:"monitors",label:"Monitors",icon:MonitorDot},{id:"sources",label:"Sources",icon:Boxes},{id:"findings",label:"Findings",icon:FileSearch},
] as const;
const secondary = [{id:"keywords",label:"Keywords",icon:KeyRound},{id:"destinations",label:"Destinations",icon:Webhook},{id:"history",label:"History",icon:Clock3}] as const;

export function AppShell({view,setView,onCreate,children}:{view:View;setView:(v:View)=>void;onCreate:()=>void;children:React.ReactNode}) {
  const [command,setCommand]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const {language,setLanguage}=useI18n();
  const labels:Record<string,string> = language==="zh" ? {overview:"概览",monitors:"监控器",sources:"来源",findings:"发现",keywords:"关键词",destinations:"通知渠道",history:"执行历史",settings:"设置",about:"关于"} : {overview:"Overview",monitors:"Monitors",sources:"Sources",findings:"Findings",keywords:"Keywords",destinations:"Destinations",history:"History",settings:"Settings",about:"About"};
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommand(true)}if(e.key==="Escape")setCommand(false)};addEventListener("keydown",fn);return()=>removeEventListener("keydown",fn)},[]);
  const nav=(item:{id:string;label:string;icon:typeof Activity;badge?:string})=>{const badge=item.id==="findings"&&findings.length>0?String(findings.length):item.badge;return <button key={item.id} onClick={()=>setView(item.id as View)} className={cn("group relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] transition",view===item.id?"bg-zinc-800/80 text-zinc-100":"text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300")}>{view===item.id&&<motion.span layoutId="nav" className="absolute -left-px h-4 w-0.5 rounded-full bg-indigo-400"/>}<item.icon size={15}/><span className="flex-1 text-left">{labels[item.id]??item.label}</span>{badge&&<span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{badge}</span>}</button>};
  return <div className="noise min-h-screen bg-[#09090b] text-zinc-100">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[226px] flex-col border-r border-zinc-800/80 bg-[#0c0c0e] p-3 md:flex">
      <div className="flex h-11 items-center gap-2.5 px-2"><VectorLogo size={29}/><div className="text-[15px] font-semibold tracking-tight">Vector</div><div className="ml-auto rounded border border-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-600">Beta</div></div>
      <Button onClick={onCreate} className="my-4 w-full justify-start"><span className="text-lg leading-none">+</span>{language==="zh"?"新建监控器":"New monitor"}<span className="ml-auto text-[10px] text-indigo-200/70">N</span></Button>
      <nav className="space-y-0.5">{primary.map(nav)}</nav>
      <div className="mb-2 mt-5 px-3 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-700">{language==="zh"?"管理":"Manage"}</div><nav className="space-y-0.5">{secondary.map(nav)}</nav>
      <div className="mt-auto space-y-0.5">{nav({id:"about",label:"About",icon:Building2})}{nav({id:"settings",label:"Settings",icon:Settings})}</div>
      <button onClick={()=>setView("settings")} className="mt-3 flex w-full items-center gap-2.5 border-t border-zinc-800/70 px-2 pt-4 text-left hover:text-white"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold">AL</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">Alex Lin</div><div className="truncate text-[10px] text-zinc-600">{language==="zh"?"研究工作区":"Research workspace"}</div></div><ChevronDown size={13} className="text-zinc-600"/></button>
    </aside>
    <header className="fixed left-0 right-0 top-0 z-10 flex h-14 items-center border-b border-zinc-800/70 bg-[#09090b]/85 px-5 backdrop-blur-xl md:left-[226px]"><button onClick={()=>setCommand(true)} className="flex h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 text-xs text-zinc-600 transition hover:border-zinc-700"><Search size={13}/>{language==="zh"?"搜索监控器、发现、来源...":"Search monitors, findings, sources..."}<span className="ml-auto flex items-center gap-0.5 rounded border border-zinc-700 px-1.5 py-0.5 text-[9px]"><Command size={9}/>K</span></button><div className="relative ml-auto flex items-center gap-2"><button onClick={()=>setLanguage(language==="zh"?"en":"zh")} className="h-8 min-w-14 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-400 hover:border-zinc-700 hover:text-white">{language==="zh"?"EN":"中文"}</button><button aria-label={language==="zh"?"通知":"Notifications"} onClick={()=>setNotifications(value=>!value)} className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"><Bell size={16}/></button>{notifications&&<div className="absolute right-0 top-10 w-64 rounded-xl border border-zinc-800 bg-[#111113] p-4 shadow-2xl"><div className="text-xs font-medium">{language==="zh"?"通知":"Notifications"}</div><p className="mt-2 text-xs leading-5 text-zinc-600">{language==="zh"?"暂无真实通知。监控器完成执行后会显示在这里。":"No real notifications yet. Completed monitor deliveries will appear here."}</p></div>}</div></header>
    <main className="min-h-screen pt-14 md:pl-[226px]"><div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-9">{children}</div></main>
    <AnimatePresence>{command&&<CommandPalette close={()=>setCommand(false)} setView={setView} onCreate={onCreate}/>}</AnimatePresence>
  </div>
}

function CommandPalette({close,setView,onCreate}:{close:()=>void;setView:(v:View)=>void;onCreate:()=>void}) {
  const {language}=useI18n(); const [query,setQuery]=useState("");
  const actions=[{label:language==="zh"?"创建新监控器":"Create a new monitor",icon:MonitorDot,fn:()=>{close();onCreate()}},{label:language==="zh"?"查看今日发现":"View today's findings",icon:Inbox,fn:()=>{setView("findings");close()}},{label:language==="zh"?"浏览来源提供商":"Browse source providers",icon:Boxes,fn:()=>{setView("sources");close()}},{label:language==="zh"?"打开执行历史":"Open execution history",icon:Activity,fn:()=>{setView("history");close()}}].filter(action=>action.label.toLowerCase().includes(query.toLowerCase()));
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex justify-center bg-black/65 px-4 pt-[16vh] backdrop-blur-sm" onMouseDown={close}><motion.div initial={{opacity:0,scale:.98,y:-8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98}} onMouseDown={e=>e.stopPropagation()} className="h-fit w-full max-w-xl overflow-hidden rounded-xl border border-zinc-700 bg-[#111113] shadow-2xl"><div className="flex h-12 items-center gap-3 border-b border-zinc-800 px-4"><Search size={16} className="text-zinc-500"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={language==="zh"?"搜索操作...":"Search actions..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"/><button aria-label={language==="zh"?"关闭":"Close"} onClick={close}><X size={15} className="text-zinc-600"/></button></div><div className="p-2"><div className="px-2 py-2 text-[10px] uppercase tracking-widest text-zinc-600">{language==="zh"?"快捷操作":"Quick actions"}</div>{actions.map((a,i)=><button key={a.label} onClick={a.fn} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"><a.icon size={15} className="text-zinc-500"/>{a.label}{i===0&&<span className="ml-auto text-[10px] text-zinc-600">N</span>}</button>)}{actions.length===0&&<div className="px-3 py-6 text-center text-xs text-zinc-600">{language==="zh"?"没有匹配操作":"No matching actions"}</div>}</div><div className="flex gap-4 border-t border-zinc-800 px-4 py-2.5 text-[10px] text-zinc-600"><span>Enter {language==="zh"?"选择":"Select"}</span><span>Esc {language==="zh"?"关闭":"Close"}</span></div></motion.div></motion.div>;
}


