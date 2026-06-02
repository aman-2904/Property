import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AuraCommission - Premium MLM Property Commission Platform",
  description:
    "Empower your real estate sales force with direct and multi-level override commission tracking, real-time payouts, and interactive tree networks.",
  keywords: [
    "MLM",
    "Real Estate",
    "Commission Tracking",
    "Property Platform",
    "Downline Tree",
    "SaaS Dashboard",
  ],
  authors: [{ name: "AuraCommission Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
