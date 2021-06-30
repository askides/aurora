import useSWR from "swr";
import { client } from "../utils/api";

export const useUser = () => {
  const fetcher = (...args) => client.get(...args).then((res) => res.data);

  const { data, error } = useSWR(`/v2/me`, fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
  };
};
