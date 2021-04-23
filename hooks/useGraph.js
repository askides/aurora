import useSWR from "swr";

export const useGraph = (url, timeRange) => {
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR([url, timeRange], (url, range) => fetcher(url, { range }));

  return {
    graph: data,
    isLoading: !error && !data,
    isError: error,
  };
};
