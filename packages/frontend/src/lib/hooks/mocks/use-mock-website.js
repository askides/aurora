import * as React from "react";

export function useMockWebsite() {
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  React.useEffect(() => {
    const website = {
      id: "1",
      name: "MantenTech",
      url: "https://manten.tech",
      is_public: true,
    };

    sleep(1500).then(() => {
      setData(website);
      setIsLoading(false);
    });
  }, []);

  return { data, isLoading };
}
