import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
      <Toaster richColors position="top-right" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}