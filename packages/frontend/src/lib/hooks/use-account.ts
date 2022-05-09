import useSWR from "swr";
import { User } from "../../types";
import { client } from "../client";

const fetcher = (url: string) => client.get(url).then((res) => res.data);

export function useAccount() {
  const { data, error } = useSWR<User, Error>(`/me`, fetcher);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
