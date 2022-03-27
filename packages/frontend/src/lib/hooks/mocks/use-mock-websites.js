import * as React from "react";
import websites from "../../../data/websites.json";

export function useMockWebsites() {
  const [data, setData] = React.useState([]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  React.useEffect(() => {
    sleep(1500).then(() => {
      setData(websites);
    });
  }, []);

  return data;
}
