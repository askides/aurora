import "../styles/globals.css";

import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";

const App = ({ Component, pageProps }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
};

export default App;
