import useSWR from "swr";
import { client } from "../client";

const fetcher = (url) => client.get(url).then((res) => res.data);

export function useAccount() {
  const { data, error } = useSWR(`/me`, fetcher);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
