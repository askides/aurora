import { IconButton, useColorMode } from "@chakra-ui/react";
import { Moon, Sun } from "tabler-icons-react";

const ToggleButton = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      aria-label={`Toggle ${colorMode === "light" ? "Dark" : "Light"}`}
      icon={colorMode === "light" ? <Moon /> : <Sun />}
      onClick={toggleColorMode}
    />
  );
};

export { ToggleButton };
