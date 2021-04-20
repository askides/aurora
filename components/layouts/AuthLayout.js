const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-white flex">
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <div>
          <img className="h-12 w-auto" src="/logos/aurora.svg" alt="Aurora Logo" />
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
    <div className="hidden lg:block relative w-0 flex-1">
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src="https://images.unsplash.com/photo-1473711409856-39138e48cb9b?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&q=800"
        alt=""
      />
    </div>
  </div>
);

export default AuthLayout;
