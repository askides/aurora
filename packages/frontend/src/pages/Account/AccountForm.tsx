import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  useToast,
} from "@chakra-ui/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { client } from "../../lib/client";
import { useAccount } from "../../lib/hooks/use-account";

type AccountFormFields = {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function AccountForm() {
  const toast = useToast();
  const { data, isLoading, isError } = useAccount();

  const {
    reset,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AccountFormFields>();

  React.useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [isLoading, data, isError, reset]);

  const onSuccess = () => {
    toast({ status: "success", title: "Account updated!" });
  };

  const onError = () => {
    toast({ status: "error", title: "An error has occurred.." });
  };

  const onSubmit = async (data: any) => {
    // Removing password fields if empty
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== "")
    );

    await client.put(`/me`, payload).then(onSuccess).catch(onError);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Panel as="form" onSubmit={handleSubmit(onSubmit)}>
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
    </Panel>
  );
}
