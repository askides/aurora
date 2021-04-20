import useSWR from "swr";

export const useUser = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(`/api/me`, fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
  };
};
