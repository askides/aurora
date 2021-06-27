import useSWR from "swr";
import { client } from "../utils/api";

export const useRealtime = ({ seed }) => {
  const fetcher = (...args) => client.get(...args).then((res) => res.data);

  const { data, error } = useSWR(`/v2/metrics/${seed}/realtime/visitors`, fetcher, {
    refreshInterval: 2000,
  });

  return {
    visitors: data,
    isLoading: !error && !data,
    isError: error,
  };
};
