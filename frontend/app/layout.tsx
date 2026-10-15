import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ALEMAX | Global Ingredients",
  description:
    "Connecting global markets with ingredient manufacturers. Food additives, ingredients and chemical raw materials from ALEMAX.",
  icons: { icon: "/images/favicon.ico" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
