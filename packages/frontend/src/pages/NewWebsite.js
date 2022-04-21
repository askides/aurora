import { Box, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Wrapper } from "../components/Wrapper";
import { NewWebsiteForm } from "../feature/Websites/NewWebsiteForm";

export function NewWebsite() {
  return (
    <Wrapper>
      <Wrapper.Header>
        <Wrapper.Title>Create Website</Wrapper.Title>
        <Wrapper.Actions>
          <Button as={Link} to="/">
            Back to Websites
          </Button>
        </Wrapper.Actions>
      </Wrapper.Header>

      <Wrapper.Content>
        <Box boxShadow="xs" p="6" rounded="md" bg="white">
          <NewWebsiteForm />
        </Box>
      </Wrapper.Content>
    </Wrapper>
  );
}
