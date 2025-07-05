"use client";

import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";
import { UserProvider } from "@/lib/UserContext";
import { ErrorBoundary } from "@sentry/nextjs";
import * as Sentry from "@sentry/nextjs"; 
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
            <ErrorBoundary
              fallback={<p>An error occurred. Please try again.</p>}
              onError={(error) => Sentry.captureException(error)} // Log errors to Sentry
            >
              <Navbar />
              <main className="flex-grow bg-gray-50">{children}</main>
              {showFooter && <Footer />}
              <Toaster position="top-right" />
            </ErrorBoundary>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}