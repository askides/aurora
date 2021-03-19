const ListView = () => (
  <nav class="space-y-1" aria-label="Sidebar">
    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider" id="projects-headline">
      Pages
    </h3>
    {/* Current: "bg-gray-200 text-gray-900", Default: "text-gray-600 hover:bg-gray-50 hover:text-gray-900" */}
    {["/", "/who-am-i", "/terms-and-services", "/user/profile", "/domains/codd"].map((el, key) => (
      <a
        href="#"
        class="bg-gray-100 text-gray-900 group flex items-center py-2 text-sm font-medium rounded-md"
        aria-current="page">
        <span class="truncate">{el}</span>

        {/* Current: "bg-white", Default: "bg-gray-100 group-hover:bg-gray-200" */}
        <span class="bg-white ml-auto inline-block py-0.5 px-3 text-xs rounded-full">5</span>
      </a>
    ))}
  </nav>
);

export default ListView;
