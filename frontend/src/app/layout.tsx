import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopAssist AI — Product Assistant",
  description:
    "AI-powered product assistant that helps you find the best products using RAG-based retrieval and Gemini AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-gray-100 font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
