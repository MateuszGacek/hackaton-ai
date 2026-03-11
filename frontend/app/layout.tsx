import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingSans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bodyMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SwiftLayer | CMS-Driven Agency Website",
  description:
    "Professional multi-section website powered by Directus CMS, Three.js hero visuals, and structured content operations.",
};

const themeInitScript = `
(() => {
  const storageKey = "swiftlayer-theme";
  const root = document.documentElement;
  let theme = null;

  try {
    theme = window.localStorage.getItem(storageKey);
  } catch {}

  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${headingSans.variable} ${bodyMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
