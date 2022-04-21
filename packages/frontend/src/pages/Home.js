import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Wrapper } from "../components/Wrapper";
import { WebsiteListContainer } from "../feature/Websites/WebsitesList";

export function Home() {
  return (
    <Wrapper>
      <Wrapper.Header>
        <Wrapper.Title>Home</Wrapper.Title>
        <Wrapper.Actions>
          <Button as={Link} to="/websites/new">
            Create New
          </Button>
        </Wrapper.Actions>
      </Wrapper.Header>

      <Wrapper.Content>
        <WebsiteListContainer />
      </Wrapper.Content>
    </Wrapper>
  );
}
