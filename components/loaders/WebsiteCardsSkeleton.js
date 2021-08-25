import ContentLoader from "react-content-loader";

export const WebsiteCardSkeleton = (props) => (
  <ContentLoader
    speed={2}
    viewBox="0 0 400 160"
    backgroundColor="#f3f3f3"
    foregroundColor="#ecebeb"
    {...props}
  >
    <rect x="48" y="8" rx="3" ry="3" width="88" height="6" />
    <rect x="48" y="26" rx="3" ry="3" width="52" height="6" />
    <rect x="0" y="56" rx="3" ry="3" width="410" height="6" />
    <rect x="0" y="72" rx="3" ry="3" width="380" height="6" />
    <rect x="0" y="88" rx="3" ry="3" width="178" height="6" />
    <circle cx="20" cy="20" r="20" />
  </ContentLoader>
);

export const WebsiteCardsSkeleton = () => (
  <div className="grid sm:grid-cols-2 gap-4 w-full">
    <WebsiteCardSkeleton />
    <WebsiteCardSkeleton />
    <WebsiteCardSkeleton />
    <WebsiteCardSkeleton />
    <WebsiteCardSkeleton />
    <WebsiteCardSkeleton />
  </div>
);
