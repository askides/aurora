import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `text-eyebrow` is a custom utility, and tailwind-merge reads any unknown
 * `text-*` class as a colour — so `cn("text-eyebrow text-muted-foreground")`
 * would silently drop one of them. Its own class group keeps both.
 */
const twMerge = extendTailwindMerge<"eyebrow">({
  extend: {
    classGroups: {
      eyebrow: ["text-eyebrow"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
