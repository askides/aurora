import * as React from "react";
import { client } from "../client";

export function useSetup() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [needsSetup, setNeedsSetup] = React.useState(true);

  React.useEffect(() => {
    const isFlagPresent = localStorage.getItem("aurora_needsSetup");

    if (isFlagPresent && isFlagPresent === "1") {
      setNeedsSetup(true);
      setIsLoading(false);
    } else {
      client.get("/setup").then((res) => {
        setNeedsSetup(res.data.needsSetup);
        localStorage.setItem("aurora_needsSetup", Number(res.data.needsSetup));
        setIsLoading(false);
      });
    }
  }, []);

  return { isLoading, needsSetup };
}
