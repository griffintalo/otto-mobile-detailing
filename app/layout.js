import "./globals.css";

export const metadata = {
  title: "Otto Mobile Detailing — Book Online | Bucks County PA & Lake Norman NC",
  description:
    "Professional mobile car detailing in Bucks County, PA and Lake Norman, NC. We come to your driveway. Book your wash, interior, exterior, or full detail online.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
