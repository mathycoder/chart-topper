import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@ncdai/react-wheel-picker/style.css";
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chart Topper",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

function NavigationFallback() {
  return (
    <nav className="bg-felt-surface border-b border-felt-border sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <span className="text-xl font-bold text-cream">♠ Chart Topper</span>
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: applies theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=new URLSearchParams(window.location.search);var t=p.get('theme');var valid=['felt','classic','lounge','midnight','chalk','marker'];if(valid.indexOf(t)<0)t=localStorage.getItem('chart-topper-theme');if(t&&t!=='felt'&&valid.indexOf(t)>=0)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
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
