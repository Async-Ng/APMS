import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { AmplifyProvider } from "@/components/AmplifyProvider";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "APMS",
  description: "Academic Personal Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-brutal-bg font-body text-brutal-ink">
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
