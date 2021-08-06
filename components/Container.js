import { Meta } from "./Meta";
import { Navbar } from "./Navbar";

export const Container = ({ children, navbar = true }) => {
  return (
    <div className="bg-white dark:bg-black">
      <Meta />

      {navbar && (
        <div className="mb-4 sm:mb-16">
          <Navbar />
        </div>
      )}

      <main className="flex flex-col justify-center px-4 sm:px-8 bg-white dark:bg-black">
        {children}
      </main>
    </div>
  );
};
