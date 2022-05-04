import useSWR from "swr";
import { client } from "../client";

const fetcher = (url) => client.get(url).then((res) => res.data);

export function useTimeseries(filters) {
  const qs = new URLSearchParams(filters).toString();
  const { data, error } = useSWR(
    qs ? `/websites/${filters.wid}/metrics/timeseries?${qs}` : null,
    fetcher
  );

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
