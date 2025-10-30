import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LoadingProvider } from "@/components/layout/loading-provider";
import { LogoutWrapper } from "@/components/layout/logout-wrapper";

export const metadata: Metadata = {
  title: "扫码挪车 - 智能停车管理系统",
  description: "扫码挪车系统，提供车辆管理、挪车码生成、扫描记录等功能",
  keywords: ["扫码挪车", "停车管理", "挪车码", "车辆管理"],
  authors: [{ name: "扫码挪车团队" }],
  openGraph: {
    title: "扫码挪车系统",
    description: "智能停车管理系统",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <LoadingProvider>
            <LogoutWrapper>
              {children}
              <Toaster />
            </LogoutWrapper>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
