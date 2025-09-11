import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { Toaster } from "sonner";
import MobileBlockerWrapper from "@/utils/MobileBlockerWrapper";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const runtime = "edge";

export const metadata: Metadata = {
  title: "TermTalk",
  description: "Upload Terms & Conditions PDFs and query with AI insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`}>
        <main className="[background:linear-gradient(118.57deg,_#fff_50.96%,_#b3b3b3)] container max-w-screen min-h-screen overflow-hidden">
          <MobileBlockerWrapper>
          <NavBar />
          {children}
          <Toaster position="bottom-right" />
          </MobileBlockerWrapper> 
        </main>
      </body>
    </html>
  );
}
