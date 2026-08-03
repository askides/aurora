import { Footer } from "~/components/footer";
import { Navbar } from "~/components/navbar";

export function Shell({
  children,
  isPublic = false,
}: {
  children: React.ReactNode;
  isPublic?: boolean;
}) {
  return (
    <>
      <Navbar isPublic={isPublic} />

      <div className="bg-muted/40 flex min-h-screen max-w-[90rem] flex-col p-5 md:ml-20 md:p-10">
        {children}
        <Footer />
      </div>
    </>
  );
}
