import axios from "axios";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";

import { Button, TextField } from "../../components/AuroraForm";
import { Panel } from "../../components/Primitives";

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
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <Panel
        header={
          <div className="space-y-1">
            <h1 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Create Website
            </h1>
            <p className="text-sm leading-5 text-gray-500 dark:text-white">
              Insert the Website information by filling in the form below.
            </p>
          </div>
        }>
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <div className="space-y-1">
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
    </div>
  );
};

export default Websites;
