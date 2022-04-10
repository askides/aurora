import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { WebsitesList } from "../components/Websites/WebsitesList";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { useWebsites } from "../lib/hooks/use-websites";

export function Home() {
  const { data, isLoading, isError } = useWebsites();

  console.log(isLoading, isError);

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
        {!isLoading && !isError && <WebsitesList data={data} />}
      </WrapperContent>
    </Wrapper>
  );
}
