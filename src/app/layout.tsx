import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "6529 Hook Room",
  description: "Work with the swarm on the next 6529 hook change.",
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
