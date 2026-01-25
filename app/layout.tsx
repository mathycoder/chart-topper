import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Navigation } from "@/components/Navigation";
import { EdgeSwipeBlocker } from "@/components/EdgeSwipeBlocker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chart Topper - Poker Range Trainer",
  description: "Master your poker ranges with interactive quizzes",
};

function NavigationFallback() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <span className="text-xl font-bold text-slate-900">♠️ Chart Topper</span>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EdgeSwipeBlocker />
        <Suspense fallback={<NavigationFallback />}>
          <Navigation />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
