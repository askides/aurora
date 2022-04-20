import useSWR from "swr";
import { ApiClient } from "../api-client";

const fetcher = (url) => ApiClient.get(url).then((res) => res.data);

export function useMetadata(metadata, filters) {
  const qs = new URLSearchParams(filters).toString();
  const { data, error } = useSWR(
    qs
      ? `/websites/${filters.wid}/metrics/metadata?meta=${metadata}&${qs}`
      : null,
    fetcher
  );

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
