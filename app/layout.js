import "./globals.css";

export const metadata = {
  title: "Flow Studio — Client portal",
  description: "Submit requests, track status, and get your files.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
