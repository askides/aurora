import { useRouter } from "next/router";
import { ToastProvider } from "react-toast-notifications";
import { Main } from "../components/layouts/Main";
import MainLayout from "../components/layouts/MainLayout";
import AuthLayout from "../components/layouts/AuthLayout";

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
      <Main>
        <Component {...pageProps} />
      </Main>
    </ToastProvider>
  );
}

export default MyApp;
