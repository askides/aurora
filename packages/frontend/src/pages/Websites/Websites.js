import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Loader } from "../../components/Loader";
import { Wrapper } from "../../components/Wrapper";
import { useWebsites } from "../../lib/hooks/use-websites";
import { WebsitesList } from "./WebsitesList";

export function Websites() {
  const { data, isLoading, isError } = useWebsites();

  return (
    <Wrapper>
      <Wrapper.Header>
        <Wrapper.Title>Websites</Wrapper.Title>
        <Wrapper.Actions>
          <Button as={Link} to="/websites/new">
            Create New
          </Button>
        </Wrapper.Actions>
      </Wrapper.Header>

      <Wrapper.Content>
        {isLoading && <Loader />}
        {isError && <p>There was an error processing your request.</p>}
        {!isLoading && !isError && <WebsitesList data={data} />}
      </Wrapper.Content>
    </Wrapper>
  );
}
