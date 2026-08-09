import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export const metadata = {
  title: "Flow Studio — Client portal",
  description: "Submit requests, track status, and get your files.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flow Studio",
  },
};

export const viewport = {
  themeColor: "#CB181D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
