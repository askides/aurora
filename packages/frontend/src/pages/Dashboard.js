import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Analytics } from "../components/Analytics";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";

export function Dashboard() {
  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Dashboard</WrapperTitle>
        <WrapperActions>
          <Button as={Link} to="/">
            Back to Websites
          </Button>
        </WrapperActions>
      </WrapperHeader>

      <WrapperContent>
        <Analytics wid={1234} />
      </WrapperContent>
    </Wrapper>
  );
}
