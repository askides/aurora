import axios from "axios";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";

import { TextField, Button } from "../../../components/AuroraForm";
import { Panel } from "../../../components/Primitives";
import { withAuth } from "../../../components/utils/withAuth";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Websites = ({ seed }) => {
  const [initialValues, setInitialValues] = useState({ url: "" });

  useEffect(() => {
    init();

    // Set Script
    document.getElementById(
      "aurora_script"
    ).innerText = `<script src="https://app.aurora.app/_next/static/chunks/pages/_app-ad192986390a7c7db827.js" aurora-id="${seed}"></script>`;
  }, []);

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
          <div className="space-y-1">
            <h1 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Edit Website
            </h1>
            <p className="text-sm leading-5 text-gray-500 dark:text-white">
              Insert the Website information by filling in the form below.
            </p>
          </div>
        }>
        <Formik enableReinitialize initialValues={initialValues} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <div className="space-y-1">
                  <TextField label="Name" name="name" type="text" autocomplete="none" />
                  <TextField label="Website URL" name="url" type="text" autocomplete="none" />
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <Button type="submit" isLoading={isSubmitting} label="Create" />
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </Panel>

      <Panel
        header={
          <div className="space-y-1">
            <h1 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Connect Your Website
            </h1>
            <p className="text-sm leading-5 text-gray-500 dark:text-white">
              Copy this line of code in the HEAD of your page.
            </p>
          </div>
        }>
        <div className="text-white" id="aurora_script"></div>
      </Panel>
    </div>
  );
};

export default withAuth(Websites);
