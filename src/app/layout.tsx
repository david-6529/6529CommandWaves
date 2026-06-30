import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coordinate the 6529 hook",
  description: "A shared room for builders to discuss the next hook change and move one PR at a time.",
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
