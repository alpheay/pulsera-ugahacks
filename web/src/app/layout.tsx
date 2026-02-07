import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const garet = localFont({
  src: [
    { path: "../../public/fonts/Garet-Book.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Garet-Heavy.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-garet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulsera - Family Health Tracking",
  description:
    "A community hardware-health-tracking application that allows families to keep tabs on each other for healthcare and personalized caretaker applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={garet.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
