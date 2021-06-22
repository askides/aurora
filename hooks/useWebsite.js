import useSWR from "swr";
import { client } from "../utils/api";

export const useWebsite = ({ seed }) => {
  const fetcher = (...args) => client.get(...args).then((res) => res.data);

  const { data, error } = useSWR(`/v2/metrics/${seed}`, fetcher);

  return {
    website: data,
    isLoading: !error && !data,
    isError: error,
  };
};
