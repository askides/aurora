import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  useToast,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  Wrapper,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { ApiClient } from "../lib/api-client";
import { useAccount } from "../lib/hooks/use-account";

export function AccountForm({ onSubmit, values = {} }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: values });

  return (
    <VStack as="form" spacing={5} onSubmit={handleSubmit(onSubmit)}>
      <FormControl>
        <FormLabel htmlFor="firstname">Firstname</FormLabel>
        <Input id="firstname" type="text" {...register("firstname")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="lastname">Lastname</FormLabel>
        <Input id="lastname" type="text" {...register("lastname")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="email">Email</FormLabel>
        <Input id="email" type="email" {...register("email")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="password">New Password</FormLabel>
        <Input id="password" type="password" {...register("password")} />
        <FormHelperText>Minimum 8 characters.</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="confirmPassword">Repeat New Password</FormLabel>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
        <FormHelperText>Minimum 8 characters.</FormHelperText>
      </FormControl>

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Update Informations!
      </Button>
    </VStack>
  );
}

export function Account() {
  const toast = useToast();
  const { data, isLoading, isError } = useAccount();

  const handleSubmit = async (data) => {
    // Removing password fields if empty
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== "")
    );

    await ApiClient.put(`/me`, payload)
      .then(() => {
        toast({ status: "success", title: "Account updated." });
      })
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Account</WrapperTitle>
      </WrapperHeader>

      <WrapperContent isLoading={isLoading}>
        {isError && <div>Something went wrong ...</div>}
        {!isLoading && !isError && (
          <Box boxShadow="xs" p="6" rounded="md" bg="white">
            <AccountForm values={data} onSubmit={handleSubmit} />
          </Box>
        )}
      </WrapperContent>
    </Wrapper>
  );
}
