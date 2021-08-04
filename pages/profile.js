import toast from "react-hot-toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Container } from "../components/Container";
import { Page } from "../components/Page";
import { useUser } from "../hooks/useUser";
import { client } from "../utils/api";
import { localize } from "../utils/dates";

const Profile = () => {
  const { user } = useUser();
  const { register, handleSubmit, formState, reset } = useForm();

  useEffect(() => {
    if (user) {
      reset({ firstname: user.firstname, lastname: user.lastname, email: user.email });
    }
  }, [user]);

  const onSubmit = async (data) => {
    try {
      await client.put(`/v2/me`, data);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error("Something goes wrong..");
    }
  };

  if (!user) {
    return (
      <Container>
        <Page title="My Profile">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8 w-full"></div>

          <div className="flex justify-center mt-8 w-full">
            <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
              This account was created on
            </p>
          </div>
        </Page>
      </Container>
    );
  }

  return (
    <Container>
      <Page title="My Profile">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-8">
              <div className="space-y-6">
                <Input name="firstname" label="First Name" register={register} />
                <Input name="lastname" label="Last Name" register={register} />
              </div>

              <div>
                <h3 className="font-bold text-2xl md:text-2xl tracking-tight mt-14 mb-1 text-black dark:text-white">
                  Personal Information
                </h3>
                <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
                  This information will be not displayed publicly.
                </p>
              </div>

              <div className="space-y-6">
                <Input name="email" label="Email Address" register={register} />

                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-6">
                  <Input name="password" type="password" label="Password" register={register} />
                  <Input
                    name="password_confirmation"
                    type="password"
                    label="Repeat New Password"
                    register={register}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button type="submit" value="Update Profile" isLoading={formState.isSubmitting} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-center mt-8 w-full">
          <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-2">
            This account was created on {localize(user.created_at)}.
          </p>
        </div>
      </Page>
    </Container>
  );
};

export default Profile;
