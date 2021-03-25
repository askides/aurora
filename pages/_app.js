import { useRouter } from "next/router";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

import "tailwindcss/tailwind.css";
import "../assets/css/scrollbar.css";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  console.log(router.pathname);

  if (router.pathname.startsWith("/auth")) {
    return (
      <AuthLayout>
        <Component {...pageProps} />
      </AuthLayout>
    );
  }

  return (
    <MainLayout>
      <Component {...pageProps} />
    </MainLayout>
  );
}

export default MyApp;
