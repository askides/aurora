import { Button } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import {
  Wrapper,
  WrapperActions,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../../components/Wrapper";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

// TODO: Maybe a better way to handle this?
export function Analytics({ isPublic = false }) {
  const { id } = useParams();

  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Dashboard</WrapperTitle>

        {!isPublic && (
          <WrapperActions>
            <Button as={Link} to="/">
              Back to Websites
            </Button>
          </WrapperActions>
        )}
      </WrapperHeader>

      <WrapperContent>
        <AnalyticsDashboard wid={id} />
      </WrapperContent>
    </Wrapper>
  );
}
