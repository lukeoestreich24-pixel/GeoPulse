import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoPulse — Global Risk Tracker",
  description: "Real-time geopolitical risk heatmap powered by GDELT data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-[#0f1117] text-gray-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
