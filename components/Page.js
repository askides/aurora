import { Footer } from "./Footer";

export const Page = (props) => {
  const maxWidth = props.fluid ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className={`flex flex-col justify-center items-start ${maxWidth} w-full mx-auto`}>
      {props.title && (
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight text-black dark:text-white">
          {props.title}
        </h1>
      )}

      {props.subtitle && (
        <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 my-4">
          {props.subtitle}
        </p>
      )}

      <div className="mt-8 w-full">{props.children}</div>

      <Footer />
    </div>
  );
};
