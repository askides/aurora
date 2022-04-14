import {
  Badge,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { mutate } from "swr";
import { Dashboard, Trash } from "tabler-icons-react";
import { ApiClient } from "../../lib/api-client";

const ModalContext = React.createContext();

export function useModal() {
  const ctx = React.useContext(ModalContext);

  if (!ctx) {
    throw new Error("useModal must be used within a ModalProvider");
  }

  return ctx;
}

export function ModalProvider({ children }) {
  const [item, setItem] = React.useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <ModalContext.Provider value={{ isOpen, onClose, onOpen, setItem, item }}>
      {children}
    </ModalContext.Provider>
  );
}

export function Website({ id, name, is_public }) {
  const { onOpen, setItem } = useModal();

  const handleModalOpen = (item) => {
    setItem(item);
    onOpen();
  };

  const WebsiteBadge = ({ status }) => {
    const colorScheme = status ? "green" : "red";
    const label = status ? "Public" : "Private";

    return <Badge colorScheme={colorScheme}>{label}</Badge>;
  };

  return (
    <Flex
      direction="column"
      backgroundColor="white"
      boxShadow="sm"
      padding={5}
      borderRadius={3}
      gap={5}
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading as="h3" size="md">
          {name}
        </Heading>
        <WebsiteBadge status={is_public} />
      </Flex>

      <HStack spacing={10}>
        <Button flex="1" as={Link} to={`/websites/${id}/edit`}>
          View Details
        </Button>
        <HStack spacing={2}>
          <IconButton
            aria-label="View Analytics"
            icon={<Dashboard />}
            backgroundColor="blue.200"
          />
          <IconButton
            aria-label="Delete Website"
            icon={<Trash />}
            backgroundColor="red.200"
            onClick={() => handleModalOpen(id)}
          />
        </HStack>
      </HStack>
    </Flex>
  );
}

export function WebsitesList({ data }) {
  const items = data.map((website) => {
    return (
      <GridItem w="100%" key={website.id}>
        <Website {...website} />
      </GridItem>
    );
  });

  return (
    <ModalProvider>
      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {items}
      </Grid>

      <Portal>
        <DeleteWebsiteModal />
      </Portal>
    </ModalProvider>
  );
}

export function DeleteWebsiteModal() {
  const toast = useToast();
  const { isOpen, onClose, item, setItem } = useModal();

  const handleClose = () => {
    setItem(null);
    onClose();
  };

  const handleDelete = () => {
    ApiClient.delete(`/websites/${item}`)
      .then(() => {
        mutate("/websites");
        handleClose();
        toast({ status: "success", title: "Website deleted." });
      })
      .catch(() =>
        toast({ status: "error", title: "An error has occurred.." })
      );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Warning!</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          You are going to delete the website: {item}. Are you sure? All the
          data will be lost forever.
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="red" onClick={handleDelete}>
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
