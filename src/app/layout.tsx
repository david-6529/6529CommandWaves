import type { Metadata } from "next";
import { commandWaveProductCopy } from "@/lib/product-copy";
import "./globals.css";

export const metadata: Metadata = {
  title: commandWaveProductCopy.headline,
  description: commandWaveProductCopy.subhead,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark dark-app h-full bg-zinc-950 text-zinc-100 antialiased">
      <body className="dark-app flex min-h-full flex-col bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
