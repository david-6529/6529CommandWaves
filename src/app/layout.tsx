import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build Hooks Together",
  description: "Coordinate public hook work through a 6529 wave, GitHub PRs, reviews, and audit logs.",
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
