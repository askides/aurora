import NextLink from "next/link";
import { useState } from "react";
import { Formik, Form } from "formik";
import { TextField } from "../components/TextField";
import { Alert } from "../components/Alert";
import { Show } from "../components/Show";
import { Button } from "../components/Button";
import { client } from "../utils/api";
import { Aurora } from "../components/Aurora";

const Setup = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleInitialize = () => {
    setIsLoading(true);

    client
      .post("/v2/initialize/database")
      .then(() => setStep(2))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const handleSubmit = (values, { setSubmitting }) => {
    client
      .post("/v2/initialize/user", values)
      .then(() => setStep(3))
      .catch((err) => setErrors([err.response.data.message]))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col justify-center items-center">
      <Aurora className="flex-none w-24 sm:w-32 h-24 sm:h-32 rounded-lg text-blue-300" />

      <div className="px-4 sm:mx-auto sm:w-full sm:max-w-xl">
        <h2 className="mt-6 text-center font-bold text-3xl md:text-6xl tracking-tight text-black dark:text-white">
          Welcome to Aurora!
        </h2>
        <div className="mt-2 text-center text-sm sm:text-xl text-gray-600">
          <div className="text-blue-600 prose leading-relaxed font-medium">
            {step === 1 ? "We need some steps in order to get started!" : null}
            {step === 2 ? "Database initialized! Now create your account!" : null}
            {step === 3 ? "User created! Now you can login, enjoy!" : null}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center w-full sm:max-w-md">
        {step === 1 ? (
          <div className="p-4 sm:p-8 w-full">
            <Button
              block
              onClick={handleInitialize}
              type="button"
              isLoading={isLoading}
              value="Initialize Database!"
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="sm:border border-gray-200 dark:border-gray-800 sm:rounded-lg p-4 sm:p-8 max-w-md w-full space-y-5">
            <Show when={errors.length}>
              <Alert title="Something goes wrong!" messages={errors} />
            </Show>

            <Formik initialValues={{ email: "", password: "" }} onSubmit={handleSubmit}>
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
                            placeholder="jeff@amazon.com"
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
                        <Button
                          type="submit"
                          block
                          value="Create Account"
                          isLoading={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="p-4 sm:p-8 w-full">
            <NextLink href="/login">
              <a className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-black dark:text-white bg-gray-200 dark:bg-gray-800 dark:focus:outline-none focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-white dark:ring-offset-black focus:ring-gray-100 dark:focus:ring-gray-700 w-full justify-center">
                Log-In into Aurora!
              </a>
            </NextLink>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Setup;
