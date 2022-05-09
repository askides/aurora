import useSWR from "swr";
import { Website } from "../../types";
import { client } from "../client";

const fetcher = (url: string) => client.get(url).then((res) => res.data);

export function useWebsites() {
  const { data, error } = useSWR<Website[], Error>(`/websites`, fetcher);

  return {
    data: data || [],
    isLoading: !error && !data,
    isError: error,
  };
}
