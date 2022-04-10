import { Box, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { WebsitesForm } from "../components/Websites/WebsitesForm";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { ApiClient } from "../lib/api-client";

export function NewWebsite() {
  const handleSubmit = async (data) => {
    try {
      await ApiClient.post("/websites", { ...data, is_public: false }); // XXX TODO: is_public
    } catch (err) {
      console.log(err);
    }
  };

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
          <WebsitesForm isNew={true} onSubmit={handleSubmit} />
        </Box>
      </WrapperContent>
    </Wrapper>
  );
}
