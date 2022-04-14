import { Box, Button, useToast } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { WebsitesForm } from "../components/Websites/WebsitesForm";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { ApiClient } from "../lib/api-client";
import { useWebsite } from "../lib/hooks/use-website";

export function EditWebsite() {
  const toast = useToast();
  const { id } = useParams();
  const { data, isLoading, isError } = useWebsite(id);

  const handleSubmit = async (data) => {
    await ApiClient.put(`/websites/${id}`, data)
      .then(() => {
        toast({ status: "success", title: "Website updated." });
      })
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Website Details</WrapperTitle>
        <WrapperActions>
          <Button as={Link} to="/">
            Back to Websites
          </Button>
        </WrapperActions>
      </WrapperHeader>

      <WrapperContent isLoading={isLoading}>
        {isError && <div>Something went wrong ...</div>}
        {!isLoading && !isError && (
          <Box boxShadow="xs" p="6" rounded="md" bg="white">
            <WebsitesForm isNew={false} values={data} onSubmit={handleSubmit} />
          </Box>
        )}
      </WrapperContent>
    </Wrapper>
  );
}
