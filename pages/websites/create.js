import axios from "axios";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";

import AdminPageHeader from "../../components/AdminPageHeader";
import Header from "../../components/layout/Header";
import TextField from "../../components/forms/TextField";
import Button from "../../components/forms/Button";

const Websites = () => {
  const router = useRouter();
  const initialValues = { url: "" };

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .post("/api/me/websites", values)
      .then((res) => res.data.data)
      .then((res) => router.push(`/websites/${res.seed}/edit`))
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  return (
    <>
      <Header />
      <AdminPageHeader text="Create New Website" />

      <div className="bg-white dark:bg-gray-800 w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
              <Form>
                <div class="space-y-6">
                  <div class="space-y-1">
                    <h1 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Website Informations
                    </h1>
                    <p class="text-sm leading-5 text-gray-500 dark:text-white">
                      Insert the Website information by filling in the form below.
                    </p>
                  </div>

                  <div class="space-y-1">
                    <TextField label="Website URL" name="url" type="text" autocomplete="none" />
                  </div>

                  <div class="flex items-center justify-end space-x-4">
                    <Button type="submit" isLoading={isSubmitting} label="Create" />
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </>
  );
};

export default Websites;
