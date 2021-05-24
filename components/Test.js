const Com = () => (
  <div className="sm:rounded-tl-lg relative group bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-cyan-500">
    <div>
      <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
        <svg
          className="h-6 w-6"
          x-description="Heroicon name: outline/badge-check"
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          ></path>
        </svg>
      </span>
    </div>
    <div className="mt-8">
      <h3 className="text-lg font-medium text-white">
        <a href="#" className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true"></span>
          Benefits
        </a>
      </h3>
      <p className="mt-2 text-sm text-gray-100">
        Doloribus dolores nostrum quia qui natus officia quod et dolorem. Sit repellendus qui ut at
        blanditiis et quo et molestiae.
      </p>
    </div>
    <span
      className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
      aria-hidden="true"
    >
      <svg
        className="h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z"></path>
      </svg>
    </span>
  </div>
);

export const Test = () => (
  <section aria-labelledby="quick-links-title">
    <div className="rounded-lg bg-gray-800 overflow-hidden shadow divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-px">
      <Com />
      <Com />

      <Com />
    </div>
  </section>
);
