import { Caveat, Lora } from "next/font/google";

export const journalSerif = Lora({
  subsets: ["latin"],
  display: "swap",
});

export const journalHandwritten = Caveat({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});
