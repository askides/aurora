import { GlobeIcon } from "lucide-react";
import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "~/shared/ui/combobox";
import { canonicalTimeZone, listTimeZones } from "../timezone";

/**
 * Offsets for the list rows.
 *
 * The popup asks for four hundred of these the moment it opens, and each one
 * builds a formatter, so the answers are kept. They're only as current as the
 * page, which is close enough for a label that reads "GMT+2".
 */
const offsets = new Map<string, string>();

function offsetOf(zone: string) {
  const cached = offsets.get(zone);

  if (cached !== undefined) {
    return cached;
  }

  const label =
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? "";

  offsets.set(zone, label);

  return label;
}

export function TimezonePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const zones = useMemo(listTimeZones, []);

  // Only ever read inside the popup, which doesn't exist until it's opened, so
  // this can't disagree with the server the way it would in the markup.
  // Canonicalised for the same reason the list is: a host reporting
  // `Asia/Calcutta` would otherwise mark nothing at all, because the row that
  // zone is offered under is `Asia/Kolkata`.
  const detected = useMemo(
    () => canonicalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    []
  );

  return (
    <Combobox
      items={zones}
      value={value}
      onValueChange={(next: string | null) => next && onChange(next)}
    >
      <ComboboxTrigger className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 font-mono text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <GlobeIcon className="size-3.5 shrink-0" />
        <span className="truncate">{value}</span>
      </ComboboxTrigger>

      <ComboboxContent align="end" className="w-72">
        <ComboboxInput placeholder="Search time zones" showTrigger={false} />

        <ComboboxEmpty>No time zone found</ComboboxEmpty>

        <ComboboxList>
          {(zone: string) => (
            <ComboboxItem key={zone} value={zone}>
              <span className="truncate font-mono text-xs">{zone}</span>

              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {zone === detected ? "detected" : offsetOf(zone)}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
