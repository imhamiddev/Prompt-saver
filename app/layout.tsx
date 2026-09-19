import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Manager",
  description: "Your private library of AI prompts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {/* Thin progress bar at the top of the viewport during route
            transitions (spec ask: visible feedback the app is loading
            something, not just a blank pause). Color matches the app's
            --primary token (see app/globals.css). */}
        <NextTopLoader
          color="#171717"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #171717,0 0 5px #171717"
        />
        {children}
      </body>
    </html>
  );
}
