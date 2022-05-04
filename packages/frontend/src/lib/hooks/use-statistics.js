import useSWR from "swr";
import { client } from "../client";

const fetcher = (url) => client.get(url).then((res) => res.data);

export function useStatistics(filters) {
  const qs = new URLSearchParams(filters).toString();
  const { data, error } = useSWR(
    qs ? `/websites/${filters.wid}/metrics/statistics?${qs}` : null,
    fetcher
  );

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
