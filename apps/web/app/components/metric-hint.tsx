import { InfoIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

/**
 * Why every visitor figure on the dashboard is a count of visitor-*days*.
 *
 * `visitor_id` is an HMAC whose message starts with the UTC date, so the same
 * person is a different id tomorrow and no id survives midnight. The count
 * therefore grows with the length of the window rather than with the audience,
 * and "unique visitors" would be read as the opposite. Stated wherever the
 * number appears rather than once in a footnote, because every place it appears
 * is a place someone could take it for an audience.
 *
 * The word "UTC" is load-bearing and was missing. The dashboard has a timezone
 * picker and groups every chart bucket by `created_at AT TIME ZONE tz`, so "a
 * day" on screen is the viewer's day — while the identifier's day is always
 * UTC's. For a reader charting Asia/Tokyo the two split at 09:00 local, and the
 * worked example below is off by a count for anyone outside UTC unless it says
 * which day it means.
 *
 * So is the sentence about the window, which was also missing and is the larger
 * error of the two. "Counted once per UTC day" is true of the *identifier* and
 * was being read as a statement about the *figure*. Every preset resolves to
 * `now - days x 86_400_000 -> now` (`resolveWindow` in analytics.server.ts), a
 * rolling window anchored on the request instant — so it never lines up with a
 * UTC day and always crosses at least one UTC midnight. On the default "Last 24
 * hours" that means anyone who read a page on both sides of 00:00 UTC is two
 * rows in the `count(DISTINCT visitor_id)`, and how far the tile overstates is a
 * function of what time of day the dashboard was opened. Nothing on screen can
 * attribute that drift, so the hint has to.
 */
export const DAILY_VISITORS_HINT =
  "A total of daily uniques over the range, not a headcount and not a per-day rate. Counted once per UTC day: no identifier outlives the UTC day it was made, which is what lets Aurora measure this without cookies — so someone who visits every day for a week counts seven times. The range is a rolling window ending now rather than a run of whole UTC days, so it always crosses a midnight UTC and anyone who read a page on both sides of one is counted twice — on a 24-hour range that can be most of them. The chart's days are the zone you picked; this figure's are not.";

/**
 * The affordance those explanations hang off, so they all look and read alike.
 *
 * A Popover rather than a Tooltip. Base UI's tooltip trigger registers exactly
 * two interactions — hover with `mouseOnly: true`, and focus that bails unless
 * the target matches `:focus-visible` — so tapping one on a phone opens
 * nothing. Seventeen of these are drawn on a populated dashboard, and every
 * explanation the dashboard owes its reader was unreachable on touch. The
 * popover keeps the hover behaviour on a pointer (`openOnHover`) and adds the
 * press that makes it work everywhere else.
 *
 * `about` names the metric. All seventeen buttons previously answered to the
 * same "How this is measured", so a screen reader's button rotor listed
 * seventeen identical entries and the only way to tell them apart was reading
 * order.
 */
export function MetricHint({
  about,
  children,
  className,
}: {
  about: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        type="button"
        aria-label={`${about}: how this is measured`}
        className={cn(
          "rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs">{children}</PopoverContent>
    </Popover>
  );
}
