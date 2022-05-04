import {
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Panel } from "../../components/Panel";
import { useAuth } from "../../lib/context/auth-context";

type SignInFormFields = {
  email: string;
  password: string;
};

export function SignInForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInFormFields>();

  const onSuccess = () => {
    navigate("/", { replace: true });
  };

  const onError = () => {
    toast({ status: "error", title: "An error has occurred.." });
  };

  // TODO: Fix this any
  const onSubmit = async (data: any) => {
    await signIn(data.email, data.password).then(onSuccess).catch(onError);
  };

  return (
    <Panel as="form" width="100%" onSubmit={handleSubmit(onSubmit)}>
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
