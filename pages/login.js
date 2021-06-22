import { useState } from "react";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";
import { TextField } from "../components/TextField";
import { Alert } from "../components/Alert";
import { Show } from "../components/Show";
import { Button } from "../components/Button";
import { client } from "../utils/api";
import { Aurora } from "../components/Aurora";

const Login = () => {
  const router = useRouter();
  const [errors, setErrors] = useState([]);

  const initialValues = { email: "", password: "" };

  const handleSubmit = (values, { setSubmitting }) =>
    client
      .post("/v2/auth/login", values)
      .then(() => router.push("/"))
      .catch(() => setErrors(["Invalid credentials."]))
      .finally(() => setSubmitting(false));

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col justify-center items-center">
      <Aurora className="flex-none w-24 sm:w-32 h-24 sm:h-32 rounded-lg text-blue-300" />

      <div className="sm:border border-gray-200 dark:border-gray-800 sm:rounded-lg p-4 sm:p-8 mt-8 max-w-md w-full space-y-5">
        <Show when={errors.length}>
          <Alert title="Something goes wrong!" messages={errors} />
        </Show>

        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-8 divide-y divide-gray-200 dark:divide-gray-800">
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="sm:col-span-6">
                      <TextField
                        label="Email"
                        name="email"
                        type="email"
                        autocomplete="email"
                        placeholder="bill@microsoft.com"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <TextField
                        label="Password"
                        name="password"
                        type="password"
                        autocomplete="none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5">
                  <div className="flex justify-end">
                    <Button type="submit" block value="Log-In" isLoading={isSubmitting} />
                  </div>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login;
