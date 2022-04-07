import * as React from "react";
import { ApiClient } from "../api-client";

export function useSetup() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [setupDone, setSetupDone] = React.useState(false);

  React.useEffect(() => {
    ApiClient.get("/setup")
      .catch(() => setSetupDone(true))
      .finally(() => setIsLoading(false));
  }, []);

  return { isLoading, setupDone };
}
