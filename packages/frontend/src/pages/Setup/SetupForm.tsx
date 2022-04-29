import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { client } from "../../lib/client";

type SetupFormFields = {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const SetupForm = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SetupFormFields>();

  const onSuccess = () => {
    toast({ status: "success", title: "Account Created." });
    localStorage.removeItem("aurora_needsSetup");
    navigate("/signin", { replace: true }); // TODO: This not working
    console.log("Navigo");
  };

  const onError = () => {
    toast({ status: "error", title: "An error has occurred.." });
  };

  // TODO: Fix this any
  const onSubmit = async (data: any) => {
    await client.post("/setup", data).then(onSuccess).catch(onError);
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
};

export { SetupForm };
