import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Loader } from "../../components/Loader";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../../components/Wrapper";
import { useWebsites } from "../../lib/hooks/use-websites";
import { WebsitesList } from "./WebsitesList";

export function Websites() {
  const { data, isLoading, isError } = useWebsites();

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Websites</WrapperTitle>
        <WrapperActions>
          <Button as={Link} to="/websites/new">
            Create New
          </Button>
        </WrapperActions>
      </WrapperHeader>

      <WrapperContent>
        {isLoading && <Loader />}
        {isError && <p>There was an error processing your request.</p>}
        {!isLoading && !isError && <WebsitesList data={data} />}
      </WrapperContent>
    </Wrapper>
  );
}
