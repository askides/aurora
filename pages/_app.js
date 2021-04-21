import { useRouter } from "next/router";
import { ToastProvider } from "react-toast-notifications";
import { Main } from "../components/layouts/Main";

import "tailwindcss/tailwind.css";
import "../assets/css/scrollbar.css";

const isAuthPath = (path) => path.startsWith("/auth");

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  if (isAuthPath(router.pathname)) {
    return <Component {...pageProps} />;
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
