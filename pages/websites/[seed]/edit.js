import axios from "axios";
import { Formik, Form } from "formik";
import { PageHeading } from "../../../components/PageHeading";
import { TextField } from "../../../components/TextField";
import { Radio } from "../../../components/Radio";
import { Button } from "../../../components/Button";
import { Show } from "../../../components/Show";
import { withAuth } from "../../../hoc/withAuth";
import { useMeWebsite } from "../../../hooks/useMeWebsite";
import { SharedLink } from "../../../components/ShareLink";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Edit = ({ seed }) => {
  const { website, isLoading, isError, mutate } = useMeWebsite({ seed });

  const breadcumbs = ["Websites", "Edit"];

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me/websites/${seed}`, values)
      .then(mutate)
      .catch(console.log) // TODO: Error Management
      .finally(() => setSubmitting(false));

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="p-6 h-full">
      <div className="flex justify-center">
        <div>
          <PageHeading title={"Edit Website"} breadcumbs={breadcumbs} />

          <div className="mt-8">
            <Formik initialValues={website} onSubmit={handleSubmit}>
              {({ isSubmitting }) => (
                <Form>
                  <div className="space-y-8 divide-y divide-gray-200">
                    <div className="space-y-8 divide-y divide-gray-200">
                      <div>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-6">
                            <TextField label="Website Name" name="name" type="text" autocomplete="none" />
                          </div>

                          <div className="sm:col-span-6">
                            <TextField label="Website URL" name="url" type="text" autocomplete="none" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-8">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900">Share Statistics</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            If you select to share statistics, a public URL will be available presenting a read-only
                            version of the Aurora Dashboard. You can disable it later.
                          </p>
                        </div>

                        <div className="mt-6 space-y-8">
                          <fieldset>
                            <div className="space-y-4">
                              <Radio value="1" label="Yes, make it public." name="shared" />
                              <Radio value="0" label="Nope, i wanna keep it private." name="shared" />
                            </div>
                          </fieldset>

                          <Show when={website.shared}>
                            <div className="block text-sm font-medium text-gray-700">
                              Share Link: <SharedLink seed={seed} />
                            </div>
                          </Show>
                        </div>
                      </div>

                      <div className="pt-8">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900">Connect Your Website</h3>
                          <p className="mt-1 text-sm text-gray-500">Copy this line of code in the HEAD of your page.</p>
                        </div>

                        <div className="mt-6 text-sm font-medium text-gray-700">
                          {`<script async defer src="${window.location.protocol}//${window.location.hostname}${
                            location.port ? ":" + location.port : ""
                          }/aurora.js" aurora-id="${seed}"></script>`}
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

export default withAuth(Edit);
