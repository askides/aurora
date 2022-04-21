import {
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
import { ApiClient } from "../../lib/api-client";

export function SetupForm() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    await ApiClient.post("/setup", data)
      .then(() => toast({ status: "success", title: "Account Created." }))
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return (
    <VStack as="form" spacing={5} onSubmit={handleSubmit(onSubmit)}>
      <FormControl>
        <FormLabel htmlFor="firstname">First Name</FormLabel>
        <Input id="firstname" type="text" {...register("firstname")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="lastname">Last Name</FormLabel>
        <Input id="lastname" type="text" {...register("lastname")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="email">Email address</FormLabel>
        <Input id="email" type="email" {...register("email")} />
        <FormHelperText>It will be used as username.</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="password">Password</FormLabel>
        <Input id="password" type="password" {...register("password")} />
        <FormHelperText>Minimum 8 Characters</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="confirmPassword">Repeat Password</FormLabel>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
      </FormControl>

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Start using Aurora!
      </Button>
    </VStack>
  );
}
