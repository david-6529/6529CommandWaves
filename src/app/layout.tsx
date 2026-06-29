import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "6529 Hook",
  description: "Coordinate the active hook change with swarm chat, decisions, PR evidence, and review status.",
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
