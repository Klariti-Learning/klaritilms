"use client";

import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";
import { UserProvider } from "@/lib/UserContext";
import "./globals.css";

const routesWithFooter = ["/", "/my-learnings", "/login", "/signup"];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const showFooter = routesWithFooter.includes(pathname);

  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-50">
        <AuthProvider>
          <UserProvider>
            <Navbar />
            <main className="flex-grow bg-gray-50">{children}</main>
          </UserProvider>
          {showFooter && <Footer />}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
