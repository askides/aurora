import { useRouter } from "next/router";
import { Aurora } from "../../../components/Aurora";
import { Container } from "../../../components/Container";
import { Dashboard } from "../../../components/Dashboard";
import { ToggleTheme } from "../../../components/ToggleTheme";
import { Page } from "../../../components/Page";

const Shared = () => {
  const router = useRouter();
  const { seed } = router.query;

  if (!seed) {
    return (
      <Container navbar={false}>
        <Page fluid>Loading..</Page>
      </Container>
    );
  }

  return (
    <Container navbar={false}>
      <Page fluid>
        <div className="flex justify-between w-full items-center sm:px-8 mt-4 mb-8">
          <Aurora className="h-12 sm:h-14" />

          <div className="flex justify-center">
            <ToggleTheme outline />
          </div>
        </div>

        <Dashboard seed={seed} />
      </Page>
    </Container>
  );
};

export default Shared;
