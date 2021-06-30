import { useEffect } from "react";
import { useRouter } from "next/router";
import { client } from "../utils/api";

export const withAuth =
  (Component) =>
  ({ ...props }) => {
    const router = useRouter();

    useEffect(async () => {
      try {
        await client.get("/v2/me");
      } catch (err) {
        if (err.response && err.response.status == 401) {
          router.push("/login");
        } else {
          console.log(err);
        }
      }
    });

    return <Component {...props} />;
  };
