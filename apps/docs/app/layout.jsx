import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

/**
 * Nextra's <Head> component fails to render under Next 16, so the head tags it
 * would emit are declared through the App Router metadata export instead.
 */
export const metadata = {
  title: { default: "Aurora", template: "%s – Aurora" },
  description: "Aurora - Open Website Analytics",
  icons: { icon: "/aurora.svg" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

const AuroraLogo = () => (
  <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
    <svg height="28" viewBox="0 0 47.33 41.36" aria-hidden="true">
      <path
        fill="#555de4"
        d="M47.14 39.28 37.19 22l3-4.69a.18.18 0 0 1 .24-.05L43.09 19a.34.34 0 0 0 .53-.32l-.75-9.25a.36.36 0 0 0-.48-.3l-8.46 3.38a.35.35 0 0 0-.06.62l2.56 1.63a.17.17 0 0 1 0 .24l-1.73 2.73L24.87.7a1.39 1.39 0 0 0-2.41 0L.19 39.28a1.38 1.38 0 0 0 1.2 2.08L3 41.24a226.33 226.33 0 0 1 41.24 0c.57.05 1.15.1 1.72.13a1.38 1.38 0 0 0 1.18-2.09ZM6.75 36.73 23.45 7.8a.25.25 0 0 1 .43 0L32 21.87l-2.47 3.77-4.89-7.37a.35.35 0 0 0-.58 0L12.34 36.68c-1.79.12-3.59.25-5.38.42a.25.25 0 0 1-.21-.37Zm33.62.37a176.89 176.89 0 0 0-23.7-.65l7.41-10.7a.35.35 0 0 1 .59 0l4.85 7.44a.36.36 0 0 0 .59 0l4.42-6.93 6.06 10.49a.25.25 0 0 1-.22.35Z"
      />
    </svg>
    <b>Aurora</b>
  </span>
);

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Layout
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/itsrennyman/aurora/tree/main/apps/docs"
          navbar={
            <Navbar
              logo={<AuroraLogo />}
              projectLink="https://github.com/itsrennyman/aurora"
            />
          }
          footer={
            <Footer>MIT {new Date().getFullYear()} © Renato Pozzi.</Footer>
          }
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
