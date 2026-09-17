import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "As Bajo La Manga",
  description: "Juego de cartas para grupos. Creá o uníte a una sala y jugá con tus compas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-sans antialiased bg-[#020617] text-slate-100 overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
