import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "6529 Hook Room",
  description: "Coordinate the 6529 hook build: discuss scope, record decisions, build PRs, and review before merge.",
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
