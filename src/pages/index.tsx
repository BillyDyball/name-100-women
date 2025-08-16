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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="A game to name 100 famous women from history and today." />
        <meta name="author" content="Billy Dyball" />
        <meta name="keywords" content="name game, puzzle, women, history, celebrity, trivia" />
      </head>
      <NameGame />
    </div>
  );
}
