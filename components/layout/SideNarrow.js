import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Flag, UserCircle } from "../Icons";

export const SideNarrowItem = ({ href, children }) => {
  const router = useRouter();

  let className = children.props.className || "";

  if (router.pathname === href) {
    className = `bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg`;
  }

  return <Link href={href}>{React.cloneElement(children, { className })}</Link>;
};

const SideNarrow = () => (
  <nav
    aria-label="Sidebar"
    className="hidden md:block md:flex-shrink-0 md:bg-gray-800 md:overflow-y-auto"
  >
    <div className="relative w-20 flex flex-col p-3 space-y-3">
      <SideNarrowItem href="/">
        <a className="text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg">
          <span className="sr-only">Flagged</span>
          <Flag />
        </a>
      </SideNarrowItem>

      <SideNarrowItem href="/user/profile">
        <a className="text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg">
          <span className="sr-only">Customers</span>
          {/*  Heroicon name: outline/user-circle  */}
          <UserCircle />
        </a>
      </SideNarrowItem>
    </div>
  </nav>
);

export default SideNarrow;
