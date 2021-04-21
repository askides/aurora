import { useState, useEffect } from "react";

export const SharedLink = ({ seed }) => {
  const [location, setLocation] = useState({});

  useEffect(() => setLocation(window.location), window);

  const urify = (location) =>
    `${location.protocol}//${window.location.hostname}${location.port ? ":" + location.port : ""}/s/${seed}`;

  return (
    <a className="text-blue-600 hover:text-blue-500" href={urify(location)}>
      {urify(location)}
    </a>
  );
};

SharedLink.defaultProps = {
  seed: "",
};
