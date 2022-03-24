import { MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Setup } from "./pages/Setup";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <MantineProvider withNormalizeCSS>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="setup" element={<Setup />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
