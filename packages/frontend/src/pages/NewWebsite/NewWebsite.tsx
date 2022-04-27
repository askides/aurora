import { Button, useToast } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { WebsitesForm } from "../../components/WebsitesForm";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../../components/Wrapper";
import { client } from "../../lib/client";

export function NewWebsite() {
  const toast = useToast();
  const navigate = useNavigate();

  const onSuccess = () => {
    toast({ status: "success", title: "Website created." });
    navigate("/");
  };

  const onError = () => {
    toast({ status: "error", title: "An error has occurred.." });
  };

  // TODO: Fix this things.
  const handleSubmit = async (data: any) => {
    await client.post("/websites", data).then(onSuccess).catch(onError);
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
        <WebsitesForm isNew={true} onSubmit={handleSubmit} />
      </WrapperContent>
    </Wrapper>
  );
}
