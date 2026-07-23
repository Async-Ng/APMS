import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";

import { AmplifyProvider } from "@/components/AmplifyProvider";
import { ReactQueryProvider } from "@/lib/query-client";

import "./globals.css";

const headingFont = Be_Vietnam_Pro({
  variable: "--font-heading-face",
  subsets: ["latin", "vietnamese"],
  weight: ["700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "APMS",
  description: "Hệ thống quản lý học tập cá nhân",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${headingFont.variable} ${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body
        className={`${inter.className} min-h-full flex flex-col bg-brutal-bg font-body text-brutal-ink`}
      >
        <AmplifyProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}
