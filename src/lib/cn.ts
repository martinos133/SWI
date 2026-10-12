import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Vlastné tokeny (rounded-field, text-display…) musí merge poznať, inak by ich zlúčil zle.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["field", "panel", "tag"] }],
      "font-size": [{ text: ["display"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
