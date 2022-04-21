import {
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  useToast,
} from "@chakra-ui/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Panel } from "../components/Panel";
import { useAuth } from "../lib/context/auth-context";

export function SigninForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    await signIn(data.email, data.password)
      .then(() => navigate("/", { replace: true }))
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return (
    <Panel as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
      <FormControl>
        <FormLabel htmlFor="email">Email address</FormLabel>
        <Input id="email" type="email" {...register("email")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="password">Password</FormLabel>
        <Input id="password" type="password" {...register("password")} />
      </FormControl>

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Sign In!
      </Button>
    </Panel>
  );
}

export function Signin() {
  return (
    <Center height="100vh">
      <Flex direction="column" alignItems="center" gap={10} width="md">
        <Heading as="h1" size="xl">
          Please Sign In
        </Heading>
        <SigninForm />
      </Flex>
    </Center>
  );
}
