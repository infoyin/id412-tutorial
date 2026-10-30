import type { Metadata } from "next";
import { FONTS_CSS } from "./fonts";

// The browser tab title (page.tsx is a client component, so metadata lives here).
export const metadata: Metadata = { title: "臺韓對話 · 대한 대화" };

// The Google Fonts stylesheet for the block typefaces (fonts.ts). React puts it in <head>.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS_CSS} precedence="default" />
      {children}
    </>
  );
}
