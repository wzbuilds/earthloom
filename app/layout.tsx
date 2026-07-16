import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://earthloom.djingyu.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Earthloom · 地球织机",
    template: "%s · Earthloom",
  },
  description: "The Earth weaves one portrait a day — 地球每天用开放数据织出一幅自己的画像。",
  keywords: ["generative art", "open data", "data visualization", "earth", "creative coding"],
  authors: [{ name: "Earthloom" }],
  openGraph: {
    title: "Earthloom · 地球织机",
    description: "The Earth weaves one portrait a day.",
    type: "website",
    locale: "zh_CN",
    siteName: "Earthloom",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Earthloom 地球织机" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Earthloom · 地球织机",
    description: "The Earth weaves one portrait a day.",
    images: ["/og.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07080f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
