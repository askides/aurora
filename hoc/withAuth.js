import { useEffect } from "react";
import { useRouter } from "next/router";
import { client } from "../utils/api";

export const withAuth =
  (Component) =>
  ({ ...props }) => {
    const router = useRouter();

    useEffect(async () => {
      await client.get("/v2/me").catch((err) => {
        if (err.response.status == 401) {
          router.push("/auth/login");
        }
      });
    });

    return <Component {...props} />;
  };
