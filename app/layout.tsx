import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D'Blossom Model Private Schools",
  description: "D'Blossom Model Private Schools management platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
