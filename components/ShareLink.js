import { useState, useEffect, Fragment } from "react";

export const SharedLink = ({ seed }) => {
  const [location, setLocation] = useState({});

  useEffect(() => setLocation(window.location), [window]); // HELP: is this correct?

  const urify = (location) =>
    `${location.protocol}//${window.location.hostname}${location.port ? ":" + location.port : ""}/s/${seed}`;

  return (
    <Fragment>
      <a className="text-blue-600 hover:text-blue-500 block sm:hidden" href={urify(location)}>
        View Shared Page
      </a>
      <a className="text-blue-600 hover:text-blue-500 hidden sm:block" href={urify(location)}>
        {urify(location)}
      </a>
    </Fragment>
  );
};

SharedLink.defaultProps = {
  seed: "",
};
