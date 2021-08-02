import { useRouter } from "next/router";
import { useState } from "react";
import { Formik, Form } from "formik";
import { TextField } from "../components/TextField";
import { withAuth } from "../hoc/withAuth";
import { Button } from "../components/Button";
import { useUser } from "../hooks/useUser";
import { localize } from "../utils/dates";
import { Container } from "../components/Container";
import { client } from "../utils/api";
import { Show } from "../components/Show";
import { Alert } from "../components/Alert";

const Profile = () => {
  const router = useRouter();
  const [errors, setErrors] = useState([]);
  const { user, isLoading, isError } = useUser();

  const handleSubmit = async (values, { setSubmitting }) => {
    setErrors([]);

    try {
      await client.put(`/v2/me`, values);
    } catch (err) {
      setErrors([err.response.data.message]);
    }

    setSubmitting(false);
  };

  const logout = async () => {
    // TODO:
    try {
      await axios.post("/api/auth/logout");
      router.push("/auth/login");
    } catch (err) {
      console.log(err);
    }
  };

  if (!user) {
    return (
      <Container>
        <div className="flex flex-col justify-center items-start max-w-3xl w-full mx-auto mb-16">
          <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
            My Profile
          </h1>

          <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
            These are your websites, you can manage them by clicking on the proper buttons.
          </p>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8 w-full">
            ciao
          </div>

          <div className="flex justify-center mt-8 w-full">
            <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
              This account was created on
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-3xl w-full mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          My Profile
        </h1>

        <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
          These are your websites, you can manage them by clicking on the proper buttons.
        </p>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8 w-full">
          <Show when={errors.length}>
            <div className="mb-4">
              <Alert title="Something goes wrong!" messages={errors} />
            </div>
          </Show>

          <Formik initialValues={user} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
              <Form>
                <div className="space-y-8 divide-y divide-gray-200 dark:divide-gray-800">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <TextField
                        label="First Name"
                        name="firstname"
                        type="text"
                        autocomplete="none"
                      />

                      <TextField
                        label="Last Name"
                        name="lastname"
                        type="text"
                        autocomplete="none"
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                        Personal Information
                      </h3>
                      <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                        This information will be not displayed publicly.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <TextField
                        label="Email Address"
                        name="email"
                        type="email"
                        autocomplete="none"
                      />

                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-6">
                        <TextField
                          label="New Password"
                          name="password"
                          type="password"
                          autocomplete="none"
                        />

                        <TextField
                          label="Repeat New Password"
                          name="password_confirmation"
                          type="password"
                          autocomplete="none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <Button type="submit" value="Update Profile" isLoading={isSubmitting} />
                    </div>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>

        <div className="flex justify-center mt-8 w-full">
          <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
            This account was created on {localize(user.created_at)}.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Profile;
