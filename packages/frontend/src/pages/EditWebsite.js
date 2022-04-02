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
import { useMockWebsite } from "../lib/hooks/mocks/use-mock-website";

export function EditWebsite() {
  const { data, isLoading } = useMockWebsite();

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
        <Box boxShadow="xs" p="6" rounded="md" bg="white">
          <WebsitesForm isNew={false} values={data} />
        </Box>
      </WrapperContent>
    </Wrapper>
  );
}
