import { Box, Button, useToast } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
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
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    try {
      await ApiClient.post("/websites", { ...data, is_public: false }); // XXX TODO: is_public
      toast({ status: "success", title: "Website created." });
      navigate("/");
    } catch (err) {
      toast({ status: "error", title: "An error has occurred.." });
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
