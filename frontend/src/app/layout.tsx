import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Picksy — Enterprise RAG Shopping Assistant",
  description:
    "Production-grade semantic product search assistant powered by FastEmbed, Google Gemini 2.5 Flash, and Supabase pgvector.",
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
