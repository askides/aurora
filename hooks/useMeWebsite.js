import useSWR from "swr";
import { client } from "../utils/api";

export const useMeWebsite = ({ seed }) => {
  const fetcher = (...args) => client.get(...args).then((res) => res.data);

  const { data, error, mutate } = useSWR(`/v2/me/websites/${seed}`, fetcher);

  return {
    website: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};
