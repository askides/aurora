import * as React from "react";
import { ApiClient } from "../api-client";

export function useAuth() {
  const [user, setUser] = React.useState(null);

  const signIn = async (email, password) => {
    const res = await ApiClient.post("/signin", { email, password });
    const { user, accessToken } = res.data;
    setUser(user);
    localStorage.setItem("aurora_access_token", accessToken);
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("aurora_access_token");
  };

  return { signIn, signOut, user };
}
