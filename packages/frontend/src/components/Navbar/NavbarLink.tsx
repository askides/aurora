import { IconButton } from "@chakra-ui/react";
import { Link } from "react-router-dom";

interface NavbarLinkProps {
  to: string;
  icon: JSX.Element;
  label: string;
}

const NavbarLink = ({ to, icon, label }: NavbarLinkProps) => {
  return <IconButton as={Link} to={to} aria-label={label} icon={icon} />;
};

export { NavbarLink };
