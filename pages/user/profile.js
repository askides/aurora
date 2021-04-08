import axios from "axios";
import { Formik, Form } from "formik";
import { useToasts } from "react-toast-notifications";

import { TextField, Select, Button } from "../../components/AuroraForm";
import { Panel, LoadingPanel } from "../../components/Primitives";
import { withAuth } from "../../components/hoc/withAuth";
import { useUser } from "../../components/hooks/useUser";

const Profile = ({ seed }) => {
  const { addToast } = useToasts();

  const handleSubmit = (values, { setSubmitting }) =>
    axios
      .put(`/api/me`, values)
      .then((res) => res.data.data)
      .catch((err) => console.log(err))
      .finally(() => setSubmitting(false));

  const { user, isLoading, isError } = useUser();

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <Panel
        header={
          <div className="space-y-1">
            <h1 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">User Profile</h1>
          </div>
        }
      >
        <Formik enableReinitialize initialValues={user} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <div className="space-y-4">
                  <TextField label="Firstname" name="firstname" type="text" autocomplete="none" />
                  <TextField label="Lastname" name="lastname" type="text" autocomplete="none" />
                  <TextField label="Email" name="email" type="email" autocomplete="none" />
                  <TextField label="New Password" name="password" type="password" autocomplete="none" />
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <Button type="submit" isLoading={isSubmitting} label="Update Informations" />
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </Panel>
    </div>
  );
};

export default withAuth(Profile);
