import { useRouter } from "next/router";
import { ToastProvider } from "react-toast-notifications";
import { Main } from "../components/layouts/Main";

import "tailwindcss/tailwind.css";
import "../assets/css/scrollbar.css";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const isAuthPath = () =>
    router.pathname.startsWith("/auth") || router.pathname.startsWith("/setup");
  const isShareablePath = () => router.pathname.startsWith("/s");

  if (isAuthPath()) {
    return <Component {...pageProps} />;
  }

  return (
    <ToastProvider autoDismiss autoDismissTimeout={6000}>
      <Main needsSidebar={isShareablePath() ? false : true}>
        <Component {...pageProps} />
      </Main>
    </ToastProvider>
  );
}

export default MyApp;
