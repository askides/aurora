import axios from "axios";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";

import { TextField, Select, Button } from "../../../components/AuroraForm";
import { Panel, LoadingPanel } from "../../../components/Primitives";
import { withAuth } from "../../../components/hoc/withAuth";
import { useWebsite } from "../../../components/hooks/useWebsite";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Websites = ({ seed }) => {
  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me/websites/${seed}`, values)
      .then((res) => res.data.data)
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  const { website, isLoading, isError } = useWebsite({ seed });

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

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
        <Formik enableReinitialize initialValues={website} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <div className="space-y-4">
                  <TextField label="Name" name="name" type="text" autocomplete="none" />
                  <TextField label="Website URL" name="url" type="text" autocomplete="none" />
                  <Select
                    label="Share Analytics"
                    name="shared"
                    as="select"
                    allowEmpty={false}
                    options={[
                      { id: 0, value: "No" },
                      { id: 1, value: "Yes" },
                    ]}
                  />
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <Button type="submit" isLoading={isSubmitting} label="Update" />
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
        <div className="text-white">
          {`<script async defer src="${window.location.protocol}//${window.location.hostname}/aurora.js" aurora-id="${seed}"></script>`}
        </div>
      </Panel>
    </div>
  );
};

export default withAuth(Websites);
