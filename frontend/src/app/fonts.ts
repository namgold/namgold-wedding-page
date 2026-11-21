import { EB_Garamond, Ms_Madi, Playfair_Display } from "next/font/google";

export const playfair = Playfair_Display({ subsets: ["latin", "vietnamese"], variable: "--font-playfair", display: "swap" });
export const garamond = EB_Garamond({ subsets: ["latin", "vietnamese"], variable: "--font-garamond", display: "swap" });
export const script = Ms_Madi({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

export const fontVars = `${playfair.variable} ${garamond.variable} ${script.variable}`;
