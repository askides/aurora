import axios from "axios";
import { useEffect } from "react";
import { useRouter } from "next/router";

export const withAuth = (Component) => ({ ...props }) => {
  const router = useRouter();

  useEffect(async () => {
    await axios.get("/api/me").catch((err) => {
      if (err.response.status == 401) {
        router.push("/auth/login");
      }
    });
  });

  return <Component {...props} />;
};
