import * as React from "react";
import { Datatable } from "../Datatable";

export function usePages(wid) {
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000));
      setData([]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return { data, isLoading };
}

// TODO: This is Fake
export function PageDatatable({ filters }) {
  const { data, isLoading, isError } = usePages(123);

  return (
    <Datatable
      title="Page"
      isLoading={isLoading}
      isError={isError}
      data={data}
    />
  );
}
