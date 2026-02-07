import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
