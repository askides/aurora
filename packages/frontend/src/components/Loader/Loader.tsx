import { Center, Spinner } from "@chakra-ui/react";
import * as React from "react";
import { Panel } from "../Panel";

const Loader: React.FC = (props) => {
  return (
    <Panel {...props}>
      <Center>
        <Spinner />
      </Center>
    </Panel>
  );
};

export { Loader };
