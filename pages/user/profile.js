import axios from "axios";
import { Formik, Form } from "formik";
import { PageHeading } from "../../components/PageHeading";
import { TextField } from "../../components/TextField";
import { withAuth } from "../../hoc/withAuth";
import { Button } from "../../components/Button";
import { useUser } from "../../hooks/useUser";

const Profile = () => {
  const { user, isLoading, isError } = useUser();

  const breadcumbs = ["Account"];

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me`, values)
      .then((res) => res.data.data)
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

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
                              This information will be displayed publicly so be careful what you share.
                            </p>
                          </div>

                          <div className="sm:col-span-3">
                            <TextField label="First Name" name="firstname" type="text" autocomplete="none" />
                          </div>

                          <div className="sm:col-span-3">
                            <TextField label="Last Name" name="lastname" type="text" autocomplete="none" />
                          </div>

                          {/** TODO: TextArea Component */}
                          <div className="sm:col-span-6">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                              Description
                            </label>
                            <div className="mt-1">
                              <textarea
                                id="description"
                                name="description"
                                rows={4}
                                className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                                defaultValue={""}
                              />
                            </div>
                            <p className="mt-3 text-sm text-gray-500">
                              Brief description for your profile. URLs are hyperlinked.
                            </p>
                          </div>
                        </div>

                        <div className="pt-8 grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                          <div className="sm:col-span-6">
                            <h2 className="text-xl font-medium text-gray-900">Personal Information</h2>
                            <p className="mt-1 text-sm text-gray-500">
                              This information will be displayed publicly so be careful what you share.
                            </p>
                          </div>

                          <div className="sm:col-span-6">
                            <TextField label="Email Address" name="email" type="email" autocomplete="none" />
                          </div>

                          <div className="sm:col-span-3">
                            <TextField label="New Password" name="password" type="password" autocomplete="none" />
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
                            <time dateTime="2017-01-05T20:35:40">January 5, 2017, 8:35:40 PM</time>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <Button type="submit" value="Save" isLoading={isSubmitting} />
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
