import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "6529 Hook Room",
  description: "A shared workspace for the current hook change, 6529 decision, GitHub PR, and review.",
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
