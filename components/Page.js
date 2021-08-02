export const Page = (props) => (
  <div className="flex flex-col justify-center items-start max-w-3xl w-full mx-auto mb-16">
    <h1 className="font-bold text-3xl md:text-5xl tracking-tight text-black dark:text-white">
      {props.title}
    </h1>

    {props.subtitle && (
      <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 my-4">
        {props.subtitle}
      </p>
    )}

    <div className="mt-8 w-full">{props.children}</div>
  </div>
);
