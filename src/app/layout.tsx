import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vector — Research Automation Platform",
  description: "Continuously monitor the research internet and deliver what matters.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
