import { useRouter } from "next/router";
import { ToastProvider } from "react-toast-notifications";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

import "tailwindcss/tailwind.css";
import "../assets/css/scrollbar.css";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  if (router.pathname.startsWith("/auth")) {
    return (
      <AuthLayout>
        <Component {...pageProps} />
      </AuthLayout>
    );
  }

  return (
    <ToastProvider autoDismiss autoDismissTimeout={6000}>
      <MainLayout sideNarrow={!router.pathname.startsWith("/s")}>
        <Component {...pageProps} />
      </MainLayout>
    </ToastProvider>
  );
}

export default MyApp;
