import { cn } from "~/lib/utils";

type LogoProps = React.SVGProps<SVGSVGElement>;

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Aurora"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      // The mark's indigo is the brand token, so it tracks the theme instead of
      // staying at the light-mode hex on a dark surface.
      className={cn("text-primary", className)}
      {...props}
    >
      {/* Equilateral: side 18, height 18 * sqrt(3) / 2 = 15.588, centred in the box. */}
      <path d="M12 4.206 21 19.794H3Z" />
      {/* Aurora streak, anchored on both slopes. */}
      <path d="M5.7 15.118 16.49 11.983" />
    </svg>
  );
}
