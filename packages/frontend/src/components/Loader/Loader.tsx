import { Center, Spinner, SystemProps } from "@chakra-ui/react";
import { Panel } from "../Panel";

interface LoaderProps extends SystemProps {}

const Loader = (props: LoaderProps) => {
  return (
    <Panel {...props}>
      <Center>
        <Spinner />
      </Center>
    </Panel>
  );
};

export { Loader };
