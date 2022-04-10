import useSWR from "swr";
import { ApiClient } from "../api-client";

const fetcher = (url) => ApiClient.get(url).then((res) => res.data);

export function useWebsites() {
  const { data, error } = useSWR(`/websites`, fetcher);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
