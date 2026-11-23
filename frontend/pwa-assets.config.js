import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const bg = "#15533a";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: bg, fit: "contain" },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: bg, fit: "contain" },
    },
  },
  images: ["public/icon.svg"],
});
