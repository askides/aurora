import { IconButton, useColorMode } from "@chakra-ui/react";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";

const ToggleButton = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      aria-label={`Toggle ${colorMode === "light" ? "Dark" : "Light"}`}
      icon={colorMode === "light" ? <HiOutlineMoon /> : <HiOutlineSun />}
      onClick={toggleColorMode}
    />
  );
};

export { ToggleButton };
