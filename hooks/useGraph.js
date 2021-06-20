import useSWR from "swr";
import { client } from "../utils/api";

export const useGraph = (url, timeRange) => {
  const fetcher = (...args) => {
    const [url, params] = args;

    return client.get(`${url}?range=${params.range}`).then((res) => res.data);
  };

  const { data, error } = useSWR([url, timeRange], (url, range) => fetcher(url, { range }));

  return {
    graph: data,
    isLoading: !error && !data,
    isError: error,
  };
};
