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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
