const Header = () => (
  <header className="h-16 flex items-center my-2 sm:my-4">
    <nav className="bg-gray-900 w-full px-4 sm:px-6 lg:px-8">
      <div className="relative flex justify-between h-16">
        <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md bg-gray-800 text-gray-400 hover:text-gray-500 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-controls="mobile-menu"
            aria-expanded="false"
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className="h-6 w-6 block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
            <svg
              className="h-6 w-6 hidden"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
          <div className="flex-shrink-0 flex items-center">
            <img className="hidden lg:block h-8 w-auto" src="/logos/aurora.svg" alt="Aurora Logo" />
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 flex pr-1 items-center sm:static sm:inset-auto sm:ml-6 sm:pr-0">
          <img className="block lg:hidden h-7 w-auto" src="/logos/aurora.svg" alt="Aurora Logo" />
        </div>
      </div>
    </nav>
  </header>
);

export default Header;
