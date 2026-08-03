import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { BreakdownRow } from "~/lib/types";

export function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No Data Available</p>
        ) : (
          <div className="grid grid-cols-4 gap-y-1 text-sm">
            <div className="col-span-2 font-medium">Name</div>
            <div className="text-right font-medium">Views</div>
            <div className="text-right font-medium">Unique</div>

            <div className="col-span-4 my-2 border-b border-dashed" />

            {rows.map((row) => (
              <Fragment key={row.element}>
                <div className="col-span-2 truncate" title={row.element}>
                  {row.element}
                </div>
                <div className="text-right tabular-nums">{row.views}</div>
                <div className="text-right tabular-nums">{row.unique}</div>
              </Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
