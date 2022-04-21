import { Button } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { Wrapper } from "../components/Wrapper";
import { Analytics } from "../feature/Analytics";

export function Dashboard() {
  const { id } = useParams();

  return (
    <Wrapper>
      <Wrapper.Header>
        <Wrapper.Title>Dashboard</Wrapper.Title>
        <Wrapper.Actions>
          <Button as={Link} to="/">
            Back to Websites
          </Button>
        </Wrapper.Actions>
      </Wrapper.Header>

      <Wrapper.Content>
        <Analytics wid={id} />
      </Wrapper.Content>
    </Wrapper>
  );
}
