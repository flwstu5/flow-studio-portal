export default function manifest() {
  return {
    name: "Flow Studio Client Portal",
    short_name: "Flow Studio",
    description: "Submit requests, track project status, and get your files from Flow Studio.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#CB181D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
