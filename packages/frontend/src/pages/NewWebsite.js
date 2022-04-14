import { Box, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { NewWebsiteForm } from "../components/Websites/NewWebsiteForm";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";

export function NewWebsite() {
  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Create Website</WrapperTitle>
        <WrapperActions>
          <Button as={Link} to="/">
            Back to Websites
          </Button>
        </WrapperActions>
      </WrapperHeader>

      <WrapperContent>
        <Box boxShadow="xs" p="6" rounded="md" bg="white">
          <NewWebsiteForm />
        </Box>
      </WrapperContent>
    </Wrapper>
  );
}
