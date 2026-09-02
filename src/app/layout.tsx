import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitly",
  description: "Track shared expenses and settle up with friends.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
