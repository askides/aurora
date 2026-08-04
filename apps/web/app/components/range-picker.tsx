import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useIsMobile } from "~/hooks/use-mobile";
import { formatDateRange } from "~/lib/format";
import {
  CUSTOM_RANGE,
  RANGES,
  type RangeKey,
  type RangeSelection,
} from "~/lib/range";
import {
  endOfZonedDayExclusive,
  startOfZonedDay,
  zonedCalendarDay,
} from "~/lib/timezone";

/**
 * The toolbar is dense, so the segments carry the short label and the tooltip
 * carries the full one.
 */
const PRESETS = Object.entries(RANGES) as [
  RangeKey,
  (typeof RANGES)[RangeKey],
][];

export function RangePicker({
  range,
  from,
  to,
  tz,
  onChange,
}: {
  range: string;
  from: number;
  to: number;
  tz: string;
  onChange: (selection: RangeSelection) => void;
}) {
  const isMobile = useIsMobile();
  const custom = range === CUSTOM_RANGE;

  const [open, setOpen] = useState(false);
  // Seeded when the popover opens, so the calendar starts from the window on
  // screen and an abandoned edit doesn't linger into the next one.
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  function onOpenChange(next: boolean) {
    if (next) {
      setDraft(
        custom
          ? {
              from: zonedCalendarDay(from, tz),
              // `to` is the exclusive end, so the last selected square is the
              // day the instant before it falls on. Reading the boundary itself
              // would seed the calendar a day past the range on screen — and,
              // because the loader clips the end to now, that day is often one
              // the picker has disabled as being in the future.
              to: zonedCalendarDay(to - 1, tz),
            }
          : undefined
      );
    }

    setOpen(next);
  }

  /** What Apply would send, so the footer label and the button cannot disagree. */
  function windowOf(start: Date, end: Date | undefined) {
    return {
      from: startOfZonedDay(start, tz),
      to: endOfZonedDayExclusive(end ?? start, tz),
    };
  }

  function apply() {
    if (!draft?.from) {
      return;
    }

    // A single click selects one day, which reads as that whole day rather than
    // an empty window. Both edges are snapped in the zone being charted, not
    // the browser's: "Aug 1" has to mean the same midnights the buckets do.
    // The end is the next day's first instant, not the last of this one — the
    // query layer's range predicate is half-open and the comparison window is
    // anchored at `from`, so only a boundary makes the two tile exactly.
    onChange(windowOf(draft.from, draft.to));

    setOpen(false);
  }

  const preview = draft?.from ? windowOf(draft.from, draft.to) : null;

  return (
    <ButtonGroup aria-label="Date range">
      {PRESETS.map(([key, preset]) => {
        const active = key === range;

        return (
          <Tooltip key={key}>
            {/* The full label is on the button as well as in the tooltip. Base
                UI's tooltip trigger opens on hover (mouse only) and on
                :focus-visible, and a tap gives neither — so on a phone the
                segment read "7d" and nothing anywhere expanded it. */}
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  aria-label={preset.label}
                  aria-pressed={active}
                  onClick={() => onChange({ range: key })}
                >
                  {preset.short}
                </Button>
              }
            />
            <TooltipContent>{preset.label}</TooltipContent>
          </Tooltip>
        );
      })}

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant={custom ? "secondary" : "ghost"}
              aria-pressed={custom}
            >
              <CalendarIcon />
              {custom ? formatDateRange(from, to, tz) : "Custom"}
            </Button>
          }
        />

        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            // The rule guards against stealing focus on page load; this fires
            // when a popover opens on a click, where landing the caret in the
            // grid is the only way to pick a day from the keyboard.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            selected={draft}
            onSelect={setDraft}
            defaultMonth={custom ? zonedCalendarDay(from, tz) : undefined}
            numberOfMonths={isMobile ? 1 : 2}
            // Nothing has been collected from the future yet, and the server
            // clips the window to now anyway. "Today" is read in the charted
            // zone like every other boundary here: `new Date()` is the
            // browser's today, which is the day *before* Tokyo's for most of a
            // Los Angeles afternoon — so a viewer charting Tokyo from the US
            // west coast could not select the day they were already looking at.
            disabled={{ after: zonedCalendarDay(Date.now(), tz) }}
          />

          <div className="flex items-center justify-between gap-3 border-t p-2.5">
            <span className="text-xs text-muted-foreground">
              {preview
                ? formatDateRange(preview.from, preview.to, tz)
                : "Pick a start and end day"}
            </span>

            <Button size="sm" disabled={!draft?.from} onClick={apply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
