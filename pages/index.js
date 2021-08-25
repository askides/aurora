import { Container } from "../components/Container";
import { Websites } from "../components/Websites";
import { Page } from "../components/Page";
import { DividerButton } from "../components/DividerButton";
import { WebsiteCardsSkeleton } from "../components/loaders/WebsiteCardsSkeleton";
import { useMeWebsites } from "../hooks/useMeWebsites";

const Home = () => {
  const { websites } = useMeWebsites();

  if (!websites) {
    return (
      <Container>
        <Page title="Websites">
          <WebsiteCardsSkeleton />
        </Page>
      </Container>
    );
  }

  return (
    <Container>
      <Page title="Websites">
        <Websites websites={websites} />

        <div className="mt-12">
          <DividerButton link={`/websites/create`} />
        </div>
      </Page>
    </Container>
  );
};

export default Home;
