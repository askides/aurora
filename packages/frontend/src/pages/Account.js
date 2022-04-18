import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
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
  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Account</WrapperTitle>
      </WrapperHeader>

      <WrapperContent>
        <Box boxShadow="xs" p="6" rounded="md" bg="white">
          <AccountForm />
        </Box>
      </WrapperContent>
    </Wrapper>
  );
}
