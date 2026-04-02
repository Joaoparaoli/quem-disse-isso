import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quem Disse Isso?",
  description: "Party game de anonimato e dedução social",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
