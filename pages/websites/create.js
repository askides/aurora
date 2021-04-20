import axios from "axios";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";
import { PageHeading } from "../../components/PageHeading";
import { TextField } from "../../components/TextField";
import { Radio } from "../../components/Radio";
import { withAuth } from "../../hoc/withAuth";

const Create = () => {
  const router = useRouter();
  const breadcumbs = ["Websites", "Create"];
  const initialValues = { name: "", url: "", share: "no" };

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .post("/api/me/websites", values)
      .then((res) => res.data.data)
      .then((res) => router.push(`/websites/${res.seed}/edit`));

  return (
    <div className="flex justify-center">
      <div>
        <PageHeading title={"Create Website"} breadcumbs={breadcumbs} />

        <div className="mt-8">
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
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
                        If you select to share statistics, a public URL will be available presenting a read-only version
                        of the Aurora Dashboard. You can disable it later.
                      </p>
                    </div>
                    <div className="mt-6">
                      <fieldset>
                        <div className="space-y-4">
                          <Radio value={"yes"} label="Yes, make it public." name="share" />
                          <Radio value={"no"} label="Nope, i wanna keep it private." name="share" />
                        </div>
                      </fieldset>
                    </div>
                  </div>
                </div>

                <div className="pt-5">
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </Form>
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default withAuth(Create);
