import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: 'variable'
});

export const metadata: Metadata = {
  title: "IITK ProjectSpace",
  description: "The centralized platform for campus-wide project showcase and team recruitment at IIT Kanpur.",
};

// Root layout for the application, initializes global fonts and wrapping HTML tags
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <GlobalKeyboardShortcuts />
        {children}
      </body>
    </html>
  );
}
