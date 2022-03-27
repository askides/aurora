import * as React from "react";

export function useSetup() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [setupDone, setSetupDone] = React.useState(true); // XXX: This is a mock

  React.useEffect(() => {
    const needsSetup = localStorage.getItem("Aurora_Setup_Done");

    if (needsSetup === "1") {
      setSetupDone(true);
    }

    setIsLoading(false);
  }, []);

  return { isLoading, setupDone };
}
