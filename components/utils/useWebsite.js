import useSWR from "swr";

export const useWebsite = ({ seed }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(`/api/me/websites/${seed}`, fetcher);

  return {
    website: data,
    isLoading: !error && !data,
    isError: error,
  };
};
