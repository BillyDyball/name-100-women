import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => { initAnalytics(); }, []);
  return <Component {...pageProps} />;
}
