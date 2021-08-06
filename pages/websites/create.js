import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Button } from "../../components/Button";
import { Radio } from "../../components/Radio";
import { Input } from "../../components/Input";
import { Container } from "../../components/Container";
import { Page } from "../../components/Page";
import { client } from "../../utils/api";

const Create = () => {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await client.post("/v2/me/websites", {
        ...data,
        shared: Boolean(Number(data.shared)),
      });

      toast.success("Website created!");
      router.push(`/websites/${res.data.seed}/edit`);
    } catch (err) {
      toast.error("Something goes wrong..");
    }
  };

  return (
    <Container>
      <Page title="Create Website">
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

              <div className="space-y-4">
                <Radio name="shared" label="Yes, make it public." value="1" register={register} />
                <Radio
                  name="shared"
                  label="Nope, I want to keep it private."
                  value="0"
                  register={register}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button type="submit" value="Create" isLoading={formState.isSubmitting} />
              </div>
            </div>
          </form>
        </div>
      </Page>
    </Container>
  );
};

export default Create;
