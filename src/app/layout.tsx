import type { Metadata } from "next";
import { Inter, Space_Grotesk, Cairo } from "next/font/google";
import "./globals.css";
import { GrowthProvider } from "@/context/GrowthContext";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const cairo = Cairo({ subsets: ["latin", "arabic"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "Growth Hub | Cyberpunk Dashboard",
  description: "High-fidelity neural optimization interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${cairo.variable} antialiased`}>
        <ToastProvider>
          <GrowthProvider>
            {children}
          </GrowthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
