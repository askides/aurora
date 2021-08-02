import NextLink from "next/link";
import { ToggleTheme } from "./ToggleTheme";

export const Navbar = () => (
  <section className="w-full px-8 text-gray-700 bg-white">
    <div className="container flex flex-col flex-wrap items-center justify-between py-5 mx-auto md:flex-row max-w-4xl">
      <div className="relative flex flex-col md:flex-row">
        <NextLink href="/">
          <a className="flex items-center mb-5 font-medium text-gray-900 lg:w-auto lg:items-center lg:justify-center md:mb-0">
            <span className="mx-auto text-xl font-black leading-none text-gray-900 select-none">
              useaurora
            </span>
          </a>
        </NextLink>

        <nav className="flex flex-wrap items-center mb-5 text-base md:mb-0 md:pl-8 md:ml-8 md:border-l md:border-gray-200 space-x-5">
          <NextLink href="/">
            <a className="font-medium leading-6 text-gray-600 hover:text-gray-900">Websites</a>
          </NextLink>

          <NextLink href="/profile">
            <a className="font-medium leading-6 text-gray-600 hover:text-gray-900">Profile</a>
          </NextLink>
        </nav>
      </div>

      <div className="inline-flex items-center space-x-6 lg:justify-end">
        <NextLink href="/login">
          <a className="text-base font-medium leading-6 text-gray-600 whitespace-no-wrap transition duration-150 ease-in-out hover:text-gray-900">
            Sign in
          </a>
        </NextLink>

        <ToggleTheme />
      </div>
    </div>
  </section>
);
