import { Button, Center, Flex, Heading } from "@chakra-ui/react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <Center as={Flex} gap={5} height="100vh" direction="column">
      <Heading as="h1" size="lg">
        404 - Page not found!
      </Heading>

      <Button as={Link} to="/">
        Back to a safe place!
      </Button>
    </Center>
  );
};

export { NotFound };
