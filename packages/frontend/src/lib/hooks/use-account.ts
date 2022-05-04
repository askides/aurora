import useSWR from "swr";
import { client } from "../client";
import { IUser } from "../types";

const fetcher = (url: string) => client.get(url).then((res) => res.data);

export function useAccount() {
  const { data, error } = useSWR<IUser, boolean>(`/me`, fetcher);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
