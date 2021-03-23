import MainLayout from "../components/layout/MainLayout";

import "tailwindcss/tailwind.css";
import "../assets/css/scrollbar.css";

function MyApp({ Component, pageProps }) {
  return (
    <MainLayout>
      <Component {...pageProps} />
    </MainLayout>
  );
}

export default MyApp;
