import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { TEXT_SIZE_COOKIE } from "@/lib/prefs";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "mom-care",
  description: "Coordinación del cuidado diario",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "mom-care",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const large = cookieStore.get(TEXT_SIZE_COOKIE)?.value === "lg";
  return (
    <html
      lang="es"
      data-text={large ? "lg" : undefined}
      className={`${figtree.variable} ${fraunces.variable}`}
    >
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
