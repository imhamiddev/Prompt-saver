import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Manager",
  description: "Your private library of AI prompts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the `class`/`data-theme`
    // attribute on <html> before React hydrates, based on localStorage
    // or system preference - this deliberately differs from the
    // server-rendered markup on first paint, which is expected and safe
    // to suppress (see next-themes docs), not a real hydration bug.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Thin progress bar at the top of the viewport during route
              transitions (spec ask: visible feedback the app is loading
              something, not just a blank pause). Color matches the
              app's --primary token (see app/globals.css). */}
          <NextTopLoader
            color="#171717"
            height={3}
            showSpinner={false}
            shadow="0 0 10px #171717,0 0 5px #171717"
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
