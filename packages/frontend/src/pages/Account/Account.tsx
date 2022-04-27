import { useToast } from "@chakra-ui/react";
import * as React from "react";
import { Loader } from "../../components/Loader";
import {
  Wrapper,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../../components/Wrapper";
import { client } from "../../lib/client";
import { useAccount } from "../../lib/hooks/use-account";
import { AccountForm } from "./AccountForm";

export function Account() {
  const toast = useToast();
  const { data, isLoading, isError } = useAccount();

  // TODO: Remove the any
  const handleSubmit = async (data: any) => {
    // Removing password fields if empty
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== "")
    );

    await client
      .put(`/me`, payload)
      .then(() => toast({ status: "success", title: "Account updated." }))
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Account</WrapperTitle>
      </WrapperHeader>

      <WrapperContent>
        {isLoading && <Loader />}
        {isError && <div>Something went wrong ...</div>}
        {!isLoading && !isError && (
          <AccountForm values={data} onSubmit={handleSubmit} />
        )}
      </WrapperContent>
    </Wrapper>
  );
}
