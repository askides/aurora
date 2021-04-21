import useSWR from "swr";

export const useMeWebsite = ({ seed }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error, mutate } = useSWR(`/api/me/websites/${seed}`, fetcher);

  return {
    website: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};
