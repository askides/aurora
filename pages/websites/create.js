import { Formik, Form } from "formik";
import { useRouter } from "next/router";
import { TextField } from "../../components/TextField";
import { Radio } from "../../components/Radio";
import { withAuth } from "../../hoc/withAuth";
import { Button } from "../../components/Button";
import { client } from "../../utils/api";
import { Container } from "../../components/Container";

const Create = () => {
  const router = useRouter();
  const initialValues = { name: "", url: "", share: "no" };

  const handleSubmit = (values, { setSubmitting }) => {
    values.shared = Boolean(Number(values.shared));
    client
      .post("/v2/me/websites", values)
      .then((res) => res.data)
      .then((res) => router.push(`/websites/${res.seed}/edit`))
      .finally(setSubmitting(false));
  };

  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-3xl w-full mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          Create Website
        </h1>

        <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
          These are your websites, you can manage them by clicking on the proper buttons.
        </p>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8">
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
              <Form>
                <div className="space-y-8 divide-y divide-gray-200 dark:divide-gray-800">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="sm:col-span-6">
                        <TextField
                          label="Website Name"
                          name="name"
                          type="text"
                          autocomplete="none"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <TextField label="Website URL" name="url" type="text" autocomplete="none" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                        Share Statistics
                      </h3>
                      <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                        If you choose to make statistics public, a public URL will be available
                        presenting a read-only version of the Aurora Dashboard. Don't worry, you can
                        always disable it later!
                      </p>
                    </div>
                    <div className="mt-6">
                      <fieldset>
                        <div className="space-y-4">
                          <Radio value="1" label="Yes, make it public." name="shared" />
                          <Radio value="0" label="Nope, I want to keep it private." name="shared" />
                        </div>
                      </fieldset>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <Button type="submit" value="Create" isLoading={isSubmitting} />
                    </div>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Container>
  );
};

export default withAuth(Create);
