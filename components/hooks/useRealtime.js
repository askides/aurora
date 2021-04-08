import useSWR from "swr";

export const useRealtime = ({ seed }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(`/api/metrics/${seed}/realtime/visitors`, fetcher, {
    refreshInterval: 2000,
  });

  return {
    visitors: data,
    isLoading: !error && !data,
    isError: error,
  };
};
