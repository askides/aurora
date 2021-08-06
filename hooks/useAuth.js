import { useEffect, useState } from "react";
import { client } from "../utils/api";

export const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const jwt = window.localStorage.getItem("aurora_jwt");
    setUser(jwt);
  }, []);

  const signIn = async (data) => {
    const res = await client.post("/v2/auth/login", data);

    if (res.data.response_type === "jwt") {
      window.localStorage.setItem("aurora_jwt", res.data.access_token);
    }
  };

  const signOut = async () => {
    await client.post("/v2/auth/logout");
    window.localStorage.removeItem("aurora_jwt");
    setUser(null);
  };

  return { user, signIn, signOut };
};
