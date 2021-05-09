import axios from "axios";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import { PageHeading } from "../../components/PageHeading";
import { TextField } from "../../components/TextField";
import { withAuth } from "../../hoc/withAuth";
import { Button } from "../../components/Button";
import { useUser } from "../../hooks/useUser";
import { localize } from "../../utils/dates";

const Profile = () => {
  const router = useRouter();
  const { user, isLoading, isError } = useUser();

  const breadcumbs = ["Account"];

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me`, values)
      .then((res) => res.data.data)
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
      router.push("/auth/login");
    } catch (err) {
      console.log(err);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="p-6 h-full">
      <div className="flex justify-center">
        <div>
          <PageHeading title="Account" breadcumbs={breadcumbs} />

          <div className="mt-8">
            <Formik initialValues={user} onSubmit={handleSubmit}>
              {({ isSubmitting }) => (
                <Form>
                  <div className="space-y-8 divide-y divide-gray-200">
                    <div className="space-y-8 divide-y divide-gray-200">
                      <div>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-6">
                            <h2 className="text-xl font-medium text-gray-900">Profile</h2>
                            <p className="mt-1 text-sm text-gray-500">
                              This information will be not displayed publicly.
                            </p>
                          </div>

                          <div className="sm:col-span-3">
                            <TextField
                              label="First Name"
                              name="firstname"
                              type="text"
                              autocomplete="none"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <TextField
                              label="Last Name"
                              name="lastname"
                              type="text"
                              autocomplete="none"
                            />
                          </div>
                        </div>

                        <div className="pt-8 grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                          <div className="sm:col-span-6">
                            <h2 className="text-xl font-medium text-gray-900">
                              Personal Information
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                              This information will be not displayed publicly.
                            </p>
                          </div>

                          <div className="sm:col-span-6">
                            <TextField
                              label="Email Address"
                              name="email"
                              type="email"
                              autocomplete="none"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <TextField
                              label="New Password"
                              name="password"
                              type="password"
                              autocomplete="none"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <TextField
                              label="Repeat New Password"
                              name="password_confirmation"
                              type="password"
                              autocomplete="none"
                            />
                          </div>

                          <p className="text-sm text-gray-500 sm:col-span-6">
                            This account was created on{" "}
                            <time dateTime="2017-01-05T20:35:40">{localize(user.created_at)}</time>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <Button type="submit" value="Save Informations" isLoading={isSubmitting} />
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          value="Logout"
                          isLoading={isSubmitting}
                          onClick={() => logout()}
                        />
                      </div>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(Profile);
