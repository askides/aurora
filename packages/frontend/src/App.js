import { Center, Loader } from "@mantine/core";
import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Main } from "./layouts/Main";
import { useSetup } from "./lib/hooks/use-setup";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Setup } from "./pages/Setup";
import { Signin } from "./pages/Signin";

export function App() {
  const { pathname } = useLocation();
  const { setupDone, isLoading } = useSetup();

  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" variant="bars" />
      </Center>
    );
  }

  if (pathname !== "/setup" && !setupDone) {
    return <Navigate replace to="/setup" />;
  }

  return (
    <Routes>
      <Route path="/" element={<Main />}>
        <Route index element={<Home />} />
      </Route>

      <Route path="signin" element={<Signin />} />
      <Route path="setup" element={<Setup />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
