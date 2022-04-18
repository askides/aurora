import { Center, Loader } from "@mantine/core";
import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Main } from "./layouts/Main";
import { AuthProvider, useAuth } from "./lib/context/auth-context";
import { EditWebsite } from "./pages/EditWebsite";
import { Home } from "./pages/Home";
import { NewWebsite } from "./pages/NewWebsite";
import { NotFound } from "./pages/NotFound";
import { Setup } from "./pages/Setup";
import { Signin } from "./pages/Signin";

export function AuthenticatedRoute({ children }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" variant="bars" />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}

// TODO: I wanna fix this.
// export function SetupRoute({ children }) {
//   const location = useLocation();
//   const { setupDone, isLoading } = useSetup();

//   if (isLoading) {
//     return (
//       <Center style={{ height: "100vh" }}>
//         <Loader size="xl" variant="bars" />
//       </Center>
//     );
//   }

//   if (!setupDone) {
//     return <Navigate to="/setup" state={{ from: location }} replace />;
//   }

//   console.log("children", children);

//   return children;
// }

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <AuthenticatedRoute>
              <Main />
            </AuthenticatedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="websites/new" element={<NewWebsite />} />
          <Route path="websites/:id/edit" element={<EditWebsite />} />
        </Route>

        <Route path="signin" element={<Signin />} />
        <Route path="setup" element={<Setup />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
