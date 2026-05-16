import type { Metadata } from "next";
import { Inter, Space_Grotesk, Tajawal } from "next/font/google";
import "./globals.css";
import { GrowthProvider } from "@/context/GrowthContext";
import { SoundProvider } from "@/context/SoundContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PomodoroProvider } from "@/context/PomodoroContext";
import NeuralMesh from "@/components/ui/NeuralMesh";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const tajawal = Tajawal({ weight: ["400", "500", "700", "800", "900"], subsets: ["arabic"], variable: "--font-tajawal" });

export const metadata: Metadata = {
  title: "Growth Hub | Life Optimization Interface",
  description: "Professional high-fidelity life management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.add('dark')`
        }} />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${tajawal.variable} antialiased text-lg md:text-xl`}>
        <ToastProvider>
          <SoundProvider>
            <GrowthProvider>
              <PomodoroProvider>
                <NeuralMesh />
                {children}
              </PomodoroProvider>
            </GrowthProvider>
          </SoundProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
