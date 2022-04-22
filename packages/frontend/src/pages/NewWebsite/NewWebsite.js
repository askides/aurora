import { Box, Button, useToast } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { WebsitesForm } from "../../components/WebsitesForm";
import { Wrapper } from "../../components/Wrapper";
import { client } from "../../lib/client";

export function NewWebsite() {
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    await client
      .post("/websites", data)
      .then(() => {
        toast({ status: "success", title: "Website created." });
        navigate("/");
      })
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

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
          <WebsitesForm isNew={true} onSubmit={handleSubmit} />
        </Box>
      </Wrapper.Content>
    </Wrapper>
  );
}
