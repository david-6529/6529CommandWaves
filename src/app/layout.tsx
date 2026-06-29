import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "6529 Hook Builder",
  description: "Coordinate one builder wave and one smart contract repo through scoped PR work, reviews, and audit logs.",
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
