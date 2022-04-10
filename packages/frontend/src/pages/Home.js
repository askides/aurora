import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { WebsitesList } from "../components/Websites/WebsitesList";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { useWebsites } from "../lib/hooks/use-websites";

const WebsitesEmptyState = () => (
  <EmptyState
    header="You don't have any item yet."
    description="You can create one by clicking the button below."
    action={
      <Button as={Link} to="/websites/new" size="lg">
        Create First!
      </Button>
    }
  />
);

export function Home() {
  const { data, isLoading, isError } = useWebsites();
  const isEmpty = !data || data.length === 0;

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Home</WrapperTitle>
        <WrapperActions>
          <Button as={Link} to="/websites/new">
            Create New
          </Button>
        </WrapperActions>
      </WrapperHeader>

      <WrapperContent isLoading={isLoading}>
        {isError && <div>Something went wrong ...</div>}
        {!isLoading && isEmpty && <WebsitesEmptyState />}
        {!isLoading && !isError && <WebsitesList data={data} />}
      </WrapperContent>
    </Wrapper>
  );
}
