import { useRouter } from "next/router";
import { Container } from "../../../components/Container";
import { Dashboard } from "../../../components/Dashboard";
import { Page } from "../../../components/Page";

const Website = () => {
  const router = useRouter();
  const { seed } = router.query;

  if (!seed) {
    return (
      <Container>
        <Page fluid title="Dashboard">
          Loading..
        </Page>
      </Container>
    );
  }

  return (
    <Container>
      <Page fluid title="Dashboard">
        <Dashboard seed={seed} />
      </Page>
    </Container>
  );
};

export default Website;
