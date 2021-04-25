import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  BookmarkAltIcon,
  FireIcon,
  HomeIcon,
  InboxIcon,
  MenuIcon,
  UserIcon,
  XIcon,
  SparklesIcon,
  GlobeIcon,
} from "@heroicons/react/outline";
import { Show } from "../Show";

const user = {
  name: "Demo User",
  imageUrl: "https://avatars.dicebear.com/api/jdenticon/mynameisgiovannigiorgiobut.svg",
};

const navigation = [
  { name: "Home", href: "/", icon: HomeIcon, isDemo: false },
  // { name: "Trending", href: "#", icon: FireIcon },
  // { name: "Bookmarks", href: "#", icon: BookmarkAltIcon },
  // { name: "Messages", href: "#", icon: InboxIcon },
  { name: "Profile", href: "/user/profile", icon: UserIcon, isDemo: false },

  // Demo
  { name: "Aurora's Website", href: "https://useaurora.app", icon: GlobeIcon, isDemo: true },
  {
    name: "Give me a Star!",
    href: "https://github.com/itsrennyman/aurora",
    icon: SparklesIcon,
    isDemo: true,
  },
];

export const Main = ({ needsSidebar, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sm:h-screen flex bg-gray-50 overflow-hidden">
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed inset-0 flex z-40 lg:hidden"
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white focus:outline-none">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-4">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>
              <div className="pt-5 pb-4">
                <div className="flex-shrink-0 flex items-center px-4">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/workflow-mark.svg?color=indigo&shade=600"
                    alt="Workflow"
                  />
                </div>
                <nav aria-label="Sidebar" className="mt-5">
                  <div className="px-2 space-y-1">
                    {navigation
                      .filter((el) => (needsSidebar ? el.isDemo === false : el.isDemo === true))
                      .map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="group p-2 rounded-md flex items-center text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <item.icon
                            className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                          />
                          {item.name}
                        </a>
                      ))}
                  </div>
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <a href="#" className="flex-shrink-0 group block">
                  <div className="flex items-center">
                    <div>
                      <img
                        className="inline-block h-10 w-10 rounded-full"
                        src={user.imageUrl}
                        alt=""
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                        Nothing Special Here.. (For Now)
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </Transition.Child>
          <div className="flex-shrink-0 w-14" aria-hidden="true">
            {/* Force sidebar to shrink to fit close icon */}
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <Show when={needsSidebar}>
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-20">
            <div className="flex flex-col h-0 flex-1 overflow-y-auto bg-indigo-600">
              <div className="flex-1 flex flex-col">
                <div className="flex-shrink-0 bg-indigo-700 py-4 flex items-center justify-center">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/workflow-mark.svg?color=white"
                    alt="Workflow"
                  />
                </div>
                <nav aria-label="Sidebar" className="py-6 flex flex-col items-center space-y-3">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center p-4 rounded-lg text-indigo-200 hover:bg-indigo-700"
                    >
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                      <span className="sr-only">{item.name}</span>
                    </a>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex pb-5">
                <a href="#" className="flex-shrink-0 w-full">
                  <img
                    className="block mx-auto h-10 w-10 rounded-full"
                    src={user.imageUrl}
                    alt=""
                  />
                  <div className="sr-only">
                    <p>{user.name}</p>
                    <p>Account settings</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden sm:overflow-y-auto">
        {/* Mobile top navigation */}
        <div className="lg:hidden">
          <div className="bg-indigo-600 py-2 px-4 flex items-center justify-between sm:px-6 lg:px-8">
            <div>
              <img className="h-8 w-auto" src="/logos/aurora.svg" alt="Workflow" />
            </div>
            <div>
              <button
                type="button"
                className="-mr-3 h-12 w-12 inline-flex items-center justify-center bg-indigo-600 rounded-md text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 flex">
          <div className="flex-1 flex xl:overflow-hidden">
            {/* Primary column */}
            <section
              aria-labelledby="primary-heading"
              className="min-w-0 flex-1 h-full flex flex-col overflow-hidden lg:order-last"
            >
              {children}
            </section>

            {/* Secondary column (hidden on smaller screens) */}
            {/*
            <aside className="hidden lg:block lg:flex-shrink-0 lg:order-first">
              <div className="h-full relative flex flex-col w-96 border-r border-gray-200 bg-white">
                Your content
              </div>
            </aside>
            */}
          </div>
        </main>
      </div>
    </div>
  );
};

Main.defaultProps = {
  needsSidebar: true,
};
