import { Geist, Geist_Mono } from "next/font/google";
import { NameGame } from "../components/NameGame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className={`${geistSans.className} ${geistMono.className}`}>
      <head>
        <title>Name 100 Women</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <NameGame />
    </div>
  );
}
