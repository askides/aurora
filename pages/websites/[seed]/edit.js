import axios from "axios";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";

import PageTitle from "../../../components/PageTitle";
import TextField from "../../../components/forms/TextField";
import Button from "../../../components/forms/Button";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Websites = ({ seed }) => {
  const [initialValues, setInitialValues] = useState({ url: "" });

  useEffect(() => init(), []);

  const init = () =>
    axios
      .get(`/api/me/websites/${seed}`)
      .then((res) => res.data.data)
      .then((res) => setInitialValues(res))
      .catch((err) => console.log(err));

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me/websites/${seed}`, values)
      .then((res) => res.data.data)
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  return (
    <>
      <PageTitle text="Create New Website" />

      <div className="bg-white dark:bg-gray-800 w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <Formik enableReinitialize initialValues={initialValues} onSubmit={handleSubmit}>
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
