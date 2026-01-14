import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini App Host Example",
  description: "Authenticate users as a host.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
