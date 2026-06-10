import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "DSS 주문관리",
  description: "동성실리콘 주문관리 POC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
