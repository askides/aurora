import * as React from "react";
import { client } from "../client";

export function useSetup() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [setupDone, setSetupDone] = React.useState(false);

  React.useEffect(() => {
    const isFlagPresent = localStorage.getItem("aurora_setup_done");

    if (isFlagPresent) {
      setSetupDone(true);
      setIsLoading(false);
    } else {
      // TODO: check this out
      client
        .get("/setup")
        .then((res) => {
          const sd = !res.data.needsSetup;
          setSetupDone(sd);
          localStorage.setItem("aurora_setup_done", Number(sd));
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  return { isLoading, setupDone };
}
