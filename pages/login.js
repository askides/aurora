import toast from "react-hot-toast";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Button } from "../components/Button";
import { Aurora } from "../components/Aurora";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { client } from "../utils/api";

const Login = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const { register, handleSubmit, formState } = useForm();

  useEffect(async () => {
    const res = await client.get("/status");

    if (res.data.status === "uninitialized") {
      router.push("/setup");
    }
  }, []);

  const onSubmit = async (data) => {
    try {
      await signIn(data);
      toast.success("Login succeded!");
      router.push("/");
    } catch (err) {
      toast.error("Login failed..");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col justify-center items-center">
      <Aurora className="flex-none w-24 sm:w-32 h-24 sm:h-32 rounded-lg text-blue-300" />

      <div className="sm:border border-gray-200 dark:border-gray-800 sm:rounded-lg p-4 sm:p-8 mt-8 max-w-md w-full space-y-5">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-8">
            <div className="space-y-6">
              <Input
                name="email"
                type="email"
                placeholder="bill@microsoft.com"
                label="Email"
                register={register}
              />
              <Input name="password" type="password" label="Password" register={register} />
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-800">
              <Button type="submit" block value="Log-In" isLoading={formState.isSubmitting} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
