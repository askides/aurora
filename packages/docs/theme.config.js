export default {
  projectLink: "https://github.com/itsrennyman/aurora",
  docsRepositoryBase:
    "https://github.com/itsrennyman/aurora/tree/main/packages/docs", // base URL for the docs repository
  titleSuffix: " – Aurora",
  nextLinks: true,
  prevLinks: true,
  search: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: true,
  footerText: `MIT ${new Date().getFullYear()} © Renato Pozzi.`,
  footerEditLink: `Edit this page on GitHub`,
  logo: (
    <>
      <svg height="40" viewBox="0 0 47.33 41.36">
        <path
          d="M47.14 39.28 37.19 22l3-4.69a.18.18 0 0 1 .24-.05L43.09 19a.34.34 0 0 0 .53-.32l-.75-9.25a.36.36 0 0 0-.48-.3l-8.46 3.38a.35.35 0 0 0-.06.62l2.56 1.63a.17.17 0 0 1 0 .24l-1.73 2.73L24.87.7a1.39 1.39 0 0 0-2.41 0L.19 39.28a1.38 1.38 0 0 0 1.2 2.08L3 41.24a226.33 226.33 0 0 1 41.24 0c.57.05 1.15.1 1.72.13a1.38 1.38 0 0 0 1.18-2.09ZM6.75 36.73 23.45 7.8a.25.25 0 0 1 .43 0L32 21.87l-2.47 3.77-4.89-7.37a.35.35 0 0 0-.58 0L12.34 36.68c-1.79.12-3.59.25-5.38.42a.25.25 0 0 1-.21-.37Zm33.62.37a176.89 176.89 0 0 0-23.7-.65l7.41-10.7a.35.35 0 0 1 .59 0l4.85 7.44a.36.36 0 0 0 .59 0l4.42-6.93 6.06 10.49a.25.25 0 0 1-.22.35Z"
          style={{
            fill: "#555de4",
          }}
        />
      </svg>
      <span style={{ margin: "0 20px", fontWeight: 500 }}>
        Aurora - Open Web Analytics
      </span>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Aurora - Open Website Analytics" />
      <meta name="og:title" content="Aurora - Open Website Analytics" />
      <script
        async
        defer
        src="https://aurora-backend.vercel.app/tracker.js"
        aurora-id="cl2re5iw6000809l843fb61jr"
      ></script>
    </>
  ),
};
