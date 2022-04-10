import useSWR from "swr";
import { ApiClient } from "../api-client";

const fetcher = (url) => ApiClient.get(url).then((res) => res.data);

export function useWebsite(id) {
  const { data, error } = useSWR(`/websites/${id}`, fetcher);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
