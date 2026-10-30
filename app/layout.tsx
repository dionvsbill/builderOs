import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuilderOS — Build anything visually",
  description: "A professional workspace for building websites, forms and online stores."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
