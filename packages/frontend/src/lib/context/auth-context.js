import * as React from "react";
import { ApiClient } from "../api-client";

const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem("aurora_access_token");

    if (token) {
      ApiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

      ApiClient.get("/me")
        .then((res) => setUser(res.data))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    const res = await ApiClient.post("/signin", { email, password });
    const { user, accessToken } = res.data;
    ApiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    localStorage.setItem("aurora_access_token", accessToken);
    setUser(user);
  };

  const signOut = async () => {
    ApiClient.defaults.headers.common.Authorization = null;
    localStorage.removeItem("aurora_access_token");
    setUser(null);
  };

  const value = { user, isLoading, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);
