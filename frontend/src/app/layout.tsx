import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelDAO",
  description: "Decentralized content moderation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = {
    "--font-body":
      '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
    "--font-headline":
      '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  } as React.CSSProperties;

  return (
    <html lang="en" className="h-full antialiased" style={fontVariables}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--on-surface)] font-[var(--font-body)]">
        {children}
      </body>
    </html>
  );
}
