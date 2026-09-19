import type { Config } from "tailwindcss";

/**
 * HAK paleti — düşük doyumlu, sıcak; mavi-mor gradient ve aşırı doygun
 * arka plan SPEC gereği yasak. Renkler buradan tek kaynaktan gelir.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hak: {
          kagit: "#F6F1E7", // ana zemin: sıcak kum
          kart: "#FCFAF3", // yüzey
          murekkep: "#2B2620", // ana metin
          soluk: "#6E6459", // ikincil metin
          sinir: "#E3D9C8", // kenarlıklar
          vurgu: "#B0572F", // terracotta — birincil eylem
          vurguKoyu: "#97461F",
          zeytin: "#5F7050", // olumlu durum
          rozet: "#EFE4CF", // rozet zemini
          tehlike: "#A14A3C", // iade / uyarı
        },
      },
      fontFamily: {
        girdis: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
