import { Aurora } from "../../../components/Aurora";
import { Container } from "../../../components/Container";
import { Dashboard } from "../../../components/Dashboard";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Shared = ({ seed }) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  return (
    <Container navbar={false}>
      <div className="flex flex-col justify-center items-start max-w-6xl w-full mx-auto mb-16 mt-8 sm:mt-12">
        <div className="flex justify-between w-full items-center sm:px-8">
          <Aurora className="h-12 sm:h-14" />

          <div className="flex justify-center">
            <button
              aria-label="Toggle Dark Mode"
              type="button"
              className="w-10 h-10 p-3 bg-gray-200 rounded dark:bg-gray-800"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  className="w-4 h-4 text-gray-800 dark:text-gray-200"
                >
                  {resolvedTheme === "dark" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  )}
                </svg>
              )}
            </button>
          </div>
        </div>

        <Dashboard seed={seed} />

        <div className="flex w-full justify-between mt-4 flex-col items-center sm:flex-row space-y-4 sm:space-y-0">
          <p className="prose leading-relaxed text-gray-800 dark:text-gray-200 px-3">
            Powered by{" "}
            <a
              rel="noreferrer"
              target="_blank"
              href="https://useaurora.app"
              className="font-medium"
            >
              Aurora
            </a>
          </p>

          <div className="flex divide-x divide-gray-200 dark:divide-gray-800">
            <p className="prose leading-relaxed text-gray-800 dark:text-gray-200 px-3">
              <a rel="noreferrer" target="_blank" href="https://twitter.com/useaurora_app">
                Twitter
              </a>
            </p>
            <p className="prose leading-relaxed text-gray-800 dark:text-gray-200 px-3">
              <a rel="noreferrer" target="_blank" href="https://github.com/useaurora/aurora">
                Github
              </a>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Shared;
