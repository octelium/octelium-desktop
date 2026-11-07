import { extendTailwindMerge } from "tailwind-merge";

export const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "ui"],
      shadow: ["surface", "card", "raised", "overlay", "button", "button-hover", "logo"],
    },
  },
});
