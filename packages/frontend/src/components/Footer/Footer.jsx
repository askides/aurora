import { Box, Stack, Text } from "@chakra-ui/react";
import { Logo } from "../Logo";

const Footer = () => (
  <Box as="footer" role="contentinfo" pt={{ base: "12", md: "16" }}>
    <Stack spacing={{ base: "4", md: "5" }}>
      <Stack gap={10} direction="row" align="center">
        <Logo height={50} />
      </Stack>
      <Text fontSize="sm" color="subtle">
        &copy; {new Date().getFullYear()} Aurora, Open Web Analytics. All rights
        reserved.
      </Text>
    </Stack>
  </Box>
);

export { Footer };
