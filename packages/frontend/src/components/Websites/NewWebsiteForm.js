import { useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ApiClient } from "../../lib/api-client";
import { WebsitesForm } from "./WebsitesForm";

export function NewWebsiteForm() {
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    await ApiClient.post("/websites", data)
      .then(() => {
        toast({ status: "success", title: "Website created." });
        navigate("/");
      })
      .catch(() => {
        toast({ status: "error", title: "An error has occurred.." });
      });
  };

  return <WebsitesForm isNew={true} onSubmit={handleSubmit} />;
}
