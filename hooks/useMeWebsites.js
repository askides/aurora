import useSWR from "swr";

export const useMeWebsites = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/me/websites", fetcher);

  return {
    websites: data,
    isLoading: !error && !data,
    isError: error,
  };
};
