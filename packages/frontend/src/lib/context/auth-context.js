import * as React from "react";
import { client } from "../client";

const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem("aurora_access_token");

    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;

      client
        .get("/me")
        .then((res) => setUser(res.data))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    const res = await client.post("/signin", { email, password });
    const { user, accessToken } = res.data;
    client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    localStorage.setItem("aurora_access_token", accessToken);
    setUser(user);
  };

  const signOut = async () => {
    client.defaults.headers.common.Authorization = null;
    localStorage.removeItem("aurora_access_token");
    setUser(null);
  };

  const value = { user, isLoading, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);
