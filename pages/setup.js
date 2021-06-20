import Head from "next/head";
import NextLink from "next/link";
import { useState } from "react";
import { Formik, Form } from "formik";
import { TextField } from "../components/TextField";
import { Alert } from "../components/Alert";
import { Show } from "../components/Show";
import { Button } from "../components/Button";
import { client } from "../utils/api";

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Aurora | Setup</title>
      </Head>

      <div className="px-4 sm:mx-auto sm:w-full sm:max-w-xl">
        <img className="mx-auto h-32 w-auto" src="/logos/aurora_mini_gradient.svg" alt="Aurora" />
        <h2 className="mt-6 text-center font-bold text-3xl md:text-6xl tracking-tight text-black">
          Welcome to Aurora!
        </h2>
        <div className="mt-2 text-center text-sm sm:text-xl text-gray-600">
          <div className="text-indigo-600 prose leading-relaxed font-medium">
            {step === 1 ? "We need some steps in order to get started!" : null}
            {step === 2 ? "Database initialized! Now create your account!" : null}
            {step === 3 ? "User created! Now you can login, enjoy!" : null}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        {step === 1 ? (
          <Button
            onClick={handleInitialize}
            type="button"
            isLoading={isLoading}
            value="Initialize Database!"
          />
        ) : null}

        {step === 2 ? (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 sm:w-full sm:max-w-lg">
            <Formik initialValues={{ email: "", password: "" }} onSubmit={handleSubmit}>
              {({ isSubmitting }) => (
                <Form>
                  <div className="space-y-6">
                    <Show when={errors.length}>
                      <Alert title="Something goes wrong!" messages={errors} />
                    </Show>
                    <TextField type="text" name="email" label="Email Address" />
                    <TextField type="password" name="password" label="Password" />
                    <div>
                      <Button type="submit" isLoading={isSubmitting} value="Create Account" />
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        ) : null}

        {step === 3 ? (
          <NextLink href="/auth/login">
            <a class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Log-In into Aurora!
            </a>
          </NextLink>
        ) : null}
      </div>
    </div>
  );
};

export default Setup;
