"use client";
import { useState } from "react";
import { AppShell, type View } from "@/components/app-shell";
import { MonitorWizard } from "@/components/monitor-wizard";
import { AboutPage, FindingsPage, HistoryPage, MonitorsPage, OverviewPage, PlaceholderPage, SourcesPage } from "@/components/pages";
import { I18nProvider } from "@/components/i18n";
import { VectorProvider } from "@/components/vector-store";

function VectorApp() {
  const [view, setView] = useState<View>("overview");
  const [wizard, setWizard] = useState(false);
  const page = {
    overview: <OverviewPage onCreate={() => setWizard(true)} onNavigate={setView} />,
    monitors: <MonitorsPage onCreate={() => setWizard(true)} />,
    sources: <SourcesPage />,
    findings: <FindingsPage />,
    history: <HistoryPage />,
    keywords: <PlaceholderPage type="keywords" />,
    destinations: <PlaceholderPage type="destinations" />,
    settings: <PlaceholderPage type="settings" />,
    about: <AboutPage />,
  }[view];

  return wizard
    ? <MonitorWizard close={() => setWizard(false)} onComplete={() => { setWizard(false); setView("monitors"); }} />
    : <AppShell view={view} setView={setView} onCreate={() => setWizard(true)}>{page}</AppShell>;
}

export default function Home() {
  return <I18nProvider><VectorProvider><VectorApp /></VectorProvider></I18nProvider>;
}
