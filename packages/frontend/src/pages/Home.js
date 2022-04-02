import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Websites } from "../components/Websites";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { useMockWebsites } from "../lib/hooks/mocks/use-mock-websites";

export function Home() {
  const { data, isLoading } = useMockWebsites();

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
        <Websites data={data} />
      </WrapperContent>
    </Wrapper>
  );
}
