import * as React from "react";

export function useAuroraLinks(wid) {
  const [sharedLink, setSharedLink] = React.useState(null);
  const [generatedLink, setGeneratedLink] = React.useState(null);

  React.useEffect(() => {
    const currentUrl = process.env.REACT_APP_BACKEND_URL;
    const sharedLink = `${currentUrl}/s/${wid}`;
    const generatedLink = `<script async defer src="${currentUrl}/tracker.js" aurora-id="${wid}"></script>`;

    setSharedLink(sharedLink);
    setGeneratedLink(generatedLink);
  }, [wid]);

  return { sharedLink, generatedLink };
}
