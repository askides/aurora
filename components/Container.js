import Head from "next/head";
import { Navbar } from "./Navbar";

export const Container = ({ children, navbar = true }) => {
  return (
    <div className="bg-white dark:bg-black">
      <Head>
        <title>Aurora - Open Website Analytics</title>
      </Head>

      {navbar && <Navbar />}

      <main className="flex flex-col justify-center px-8 bg-white dark:bg-black">{children}</main>
    </div>
  );
};
