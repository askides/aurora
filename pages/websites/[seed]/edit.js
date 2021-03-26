import axios from "axios";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";

import { TextField, Button } from "../../../components/AuroraForm";
import { Panel } from "../../../components/Primitives";

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
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <Panel
        header={
          <div class="space-y-1">
            <h1 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Edit Website
            </h1>
            <p class="text-sm leading-5 text-gray-500 dark:text-white">
              Insert the Website information by filling in the form below.
            </p>
          </div>
        }>
        <Formik enableReinitialize initialValues={initialValues} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div class="space-y-6">
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
      </Panel>
    </div>
  );
};

export default Websites;
