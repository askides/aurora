import {
  Button,
  Center,
  Container,
  Loader,
  TextInput,
  Title,
} from "@mantine/core";
import * as React from "react";

const useNeedsSetup = () => {
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const ns = window.localStorage.getItem("needsSetup");

    if (ns === "true") {
      setNeedsSetup(true);
    }

    setIsLoading(false);
  }, []);

  return { needsSetup, isLoading };
};

export default function Setup() {
  const { needsSetup, isLoading } = useNeedsSetup();

  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" variant="bars" />
      </Center>
    );
  }

  return (
    <Container>
      <Title order={1}>This is h1 title</Title>
      <TextInput placeholder="Your name" label="Full name" required />
      <Button>Submit</Button>
    </Container>
  );
}
