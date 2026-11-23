import "./globals.css";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

export const metadata = {
  title: "Saans: live air quality, turned into a plan for your household",
  description:
    "Check today's real air quality for your city in India and get a personal plan: when to go out, how to keep indoor air clean, and greener choices with their impact.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
