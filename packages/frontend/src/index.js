import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import React from "react";
import ReactDOM from "react-dom";
import { IconContext } from "react-icons";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import theme from "./lib/theme";

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider>
      <BrowserRouter>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <IconContext.Provider value={{ size: "1.3em" }}>
          <App />
        </IconContext.Provider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
