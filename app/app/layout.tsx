import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAK — Son Saat",
  description:
    "HAK: kurallı fiyat saati. Son Saat kampanyaları için tek ekran — satıcı formu, canlı fiyat, claim, teslim ve iade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
