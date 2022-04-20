import { useMetadata } from "../../lib/hooks/use-metadata";
import { Datatable } from "../Datatable";

export function DeviceDatatable({ filters }) {
  const { data, isLoading, isError } = useMetadata("device", filters);

  return (
    <Datatable
      title="Device"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
