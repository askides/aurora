import axios from "axios";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";
import Button from "../../components/Button";
import TextField from "../../components/TextField";

const Login = () => {
  const router = useRouter();
  const initialValues = { email: "", password: "" };

  const handleSubmit = (values, setSubmitting) =>
    axios
      .post("/api/auth/login", values)
      .then(() => router.push("/"))
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  return (
    <div>
      <div>
        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Continue with</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Formik
          initialValues={initialValues}
          onSubmit={(values, { setSubmitting }) => handleSubmit(values, setSubmitting)}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <TextField label="Email address" name="email" type="email" autocomplete="email" />

                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                />

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                      Forgot your password?
                    </a>
                  </div>
                </div>

                <div>
                  <Button type="submit" isLoading={isSubmitting} label="Sign In" />
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
