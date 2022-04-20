import { useMetadata } from "../../lib/hooks/use-metadata";
import { Datatable } from "../Datatable";

export function OsDatatable({ filters }) {
  const { data, isLoading, isError } = useMetadata("os", filters);

  return (
    <Datatable
      title="Operating System"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
