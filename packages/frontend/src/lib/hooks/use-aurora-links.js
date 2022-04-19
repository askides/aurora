import * as React from "react";

export function useAuroraLinks(wid) {
  const [sharedLink, setSharedLink] = React.useState(null);
  const [generatedLink, setGeneratedLink] = React.useState(null);

  React.useEffect(() => {
    // TODO: this is no more the current url.
    const currentUrl = window.location.protocol + "//" + window.location.host;
    const sharedLink = `${currentUrl}/s/${wid}`;
    const generatedLink = `<script async defer src="${currentUrl}/tracker.js" aurora-id="${wid}"></script>`;

    setSharedLink(sharedLink);
    setGeneratedLink(generatedLink);
  }, [wid]);

  return { sharedLink, generatedLink };
}
