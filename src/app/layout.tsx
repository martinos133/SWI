import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Ubytovanie",
    template: "%s – Ubytovanie",
  },
  description: "Žiadosti o ubytovanie na univerzitných internátoch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sk" className={`${schibsted.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
