import toast from "react-hot-toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { Radio } from "../../../components/Radio";
import { Show } from "../../../components/Show";
import { useMeWebsite } from "../../../hooks/useMeWebsite";
import { SharedLink } from "../../../components/ShareLink";
import { Container } from "../../../components/Container";
import { client } from "../../../utils/api";
import { Page } from "../../../components/Page";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Edit = ({ seed }) => {
  const { website, mutate } = useMeWebsite({ seed });
  const { register, handleSubmit, formState, reset } = useForm();

  useEffect(() => {
    if (website) {
      reset({ name: website.name, url: website.url, shared: website.shared });
    }
  }, [website]);

  const onSubmit = async (data) => {
    try {
      await client.put(`/v2/me/websites/${seed}`, {
        ...data,
        shared: Boolean(Number(data.shared)),
      });

      await mutate(`/v2/me/websites/${seed}`);
      toast.success("Website updated!");
    } catch (err) {
      toast.error("Something goes wrong..");
    }
  };

  const generate = (seed) =>
    `<script async defer
  src="${process.env.NEXT_PUBLIC_API_URL}/public/aurora.js"
  aurora-id="${seed}">
</script>`;

  if (!website) {
    return (
      <Container>
        <Page title="Edit Website">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8 w-full"></div>
        </Page>
      </Container>
    );
  }

  return (
    <Container>
      <Page title="Edit Website">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-8">
              <div className="space-y-6">
                <Input name="name" label="Name" register={register} />
                <Input name="url" label="URL" register={register} />
              </div>

              <div>
                <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                  Share Statistics
                </h3>
                <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                  If you choose to make statistics public, a public URL will be available presenting
                  a read-only version of the Aurora Dashboard. Don't worry, you can always disable
                  it later!
                </p>
              </div>

              <div className="mt-6">
                <div className="space-y-4">
                  <Radio name="shared" label="Yes, make it public." value="1" register={register} />
                  <Radio
                    name="shared"
                    label="Nope, I want to keep it private."
                    value="0"
                    register={register}
                  />
                </div>

                <Show when={website.shared}>
                  <div>
                    <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                      Share Link
                    </h3>
                    <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                      <SharedLink seed={seed} />
                    </p>
                  </div>
                </Show>
              </div>

              <div className="hidden sm:block">
                <div>
                  <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                    How to Connect Your Website
                  </h3>
                  <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                    Copy this line of code in the HEAD of your page.
                  </p>
                </div>

                <pre className="rounded-md p-4 bg-gray-200 dark:bg-gray-800 text-black dark:text-white">
                  {generate(seed)}
                </pre>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <Button type="submit" value="Update Website" isLoading={formState.isSubmitting} />
              </div>
            </div>
          </form>
        </div>
      </Page>
    </Container>
  );
};

export default Edit;
