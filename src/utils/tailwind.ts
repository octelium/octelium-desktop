import { extendTailwindMerge } from "tailwind-merge";

export const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "ui"],
      shadow: ["card", "raised", "overlay"],
    },
  },
});
