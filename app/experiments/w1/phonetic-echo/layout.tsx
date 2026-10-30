import type { Metadata } from "next";

// The browser tab title (page.tsx is a client component, so metadata lives here).
export const metadata: Metadata = { title: "臺韓對話 · 대한 대화" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
