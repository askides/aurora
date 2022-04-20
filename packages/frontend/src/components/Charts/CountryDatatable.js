import { useMetadata } from "../../lib/hooks/use-metadata";
import { Datatable } from "../Datatable";

export function CountryDatatable({ filters }) {
  const { data, isLoading, isError } = useMetadata("country", filters);

  return (
    <Datatable
      title="Country"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
