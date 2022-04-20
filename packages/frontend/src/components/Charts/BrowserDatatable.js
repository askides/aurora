import { useMetadata } from "../../lib/hooks/use-metadata";
import { Datatable } from "../Datatable";

export function BrowserDatatable({ filters }) {
  const { data, isLoading, isError } = useMetadata("browser", filters);

  return (
    <Datatable
      title="Browser"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
