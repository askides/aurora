import { Spinner, useToast } from "@chakra-ui/react";
import * as React from "react";
import { Panel } from "../../components/Panel";
import { Wrapper } from "../../components/Wrapper";
import { client } from "../../lib/client";
import { useAccount } from "../../lib/hooks/use-account";
import { AccountForm } from "./AccountForm";

export function Account() {
  const toast = useToast();
  const { data, isLoading, isError } = useAccount();

  const handleSubmit = async (data) => {
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
      <Wrapper.Header>
        <Wrapper.Title>Account</Wrapper.Title>
      </Wrapper.Header>

      <Wrapper.Content>
        <Panel>
          {isLoading && <Spinner />}
          {isError && <div>Something went wrong ...</div>}
          {!isLoading && !isError && (
            <AccountForm values={data} onSubmit={handleSubmit} />
          )}
        </Panel>
      </Wrapper.Content>
    </Wrapper>
  );
}
