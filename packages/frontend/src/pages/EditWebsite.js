import { Box, Button } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { WebsitesForm } from "../components/Websites/WebsitesForm";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../components/Wrapper";
import { useWebsite } from "../lib/hooks/use-website";

export function EditWebsite() {
  const { id } = useParams();
  const { data, isLoading, isError } = useWebsite(id);

  const handleSubmit = (data) => {
    console.log("Submitted Data", data);
  };

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Edit Website</WrapperTitle>
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
