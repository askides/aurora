import useSWR from "swr";
import { client } from "../utils/api";

export const useMeWebsites = () => {
  const fetcher = (...args) => client.get(...args).then((res) => res.data);

  const { data, error } = useSWR("/v2/me/websites", fetcher);

  return {
    websites: data,
    isLoading: !error && !data,
    isError: error,
  };
};
