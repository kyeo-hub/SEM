import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AntdProvider from "@/components/AntdProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EIM - 设备点检管理系统",
  description: "Equipment Inspection & Operation Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
