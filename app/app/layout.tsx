import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://agyion.pages.dev"),
  title: "Agyion — Money with conditions",
  description:
    "Agyion locks money, proves a condition, and the money executes itself — or comes back. Four templates on Stellar: Fade, Pod, Trigger, Envoy.",
  openGraph: {
    title: "Agyion — Money with conditions",
    description:
      "Lock money, prove a condition, and the money executes itself — or comes back.",
    images: ["/media/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
