import { Center, Spinner } from "@chakra-ui/react";
import { Panel } from "../Panel";

const Loader = (props) => {
  return (
    <Panel {...props}>
      <Center>
        <Spinner />
      </Center>
    </Panel>
  );
};

export { Loader };
