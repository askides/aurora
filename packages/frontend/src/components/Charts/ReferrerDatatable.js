import { useMetadata } from "../../lib/hooks/use-metadata";
import { Datatable } from "../Datatable";

export function ReferrerDatatable({ filters }) {
  const { data, isLoading, isError } = useMetadata("referrer", filters);

  return (
    <Datatable
      title="Referrer"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
