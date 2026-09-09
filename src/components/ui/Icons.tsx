import type { SVGProps } from 'react';

/**
 * A handful of hand-drawn 24px icons. Small enough not to warrant a dependency,
 * and every one carries aria-hidden — labels are always in the text beside it.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const TodayIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h8" />
  </Svg>
);

export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7z" />
    <path d="M9 4v13M15 7v12.5" />
  </Svg>
);

export const PeopleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.6 20a6.6 6.6 0 0 1 12.8 0M16.5 5.4a3.2 3.2 0 0 1 0 5.2M18 14.4a6.6 6.6 0 0 1 3.4 5.6" />
  </Svg>
);

export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9a5 5 0 0 1 5-5h9M18 4l-3-3M18 4l-3 3" />
    <path d="M20 15a5 5 0 0 1-5 5H6M6 20l3 3M6 20l3-3" />
  </Svg>
);

export const InvoiceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h9l4 4v14l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L4 21V5a2 2 0 0 1 2-2Z" />
    <path d="M8 9h7M8 13h7" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.3-2h6.8l1.3 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5Z" />
    <circle cx="12" cy="13" r="3.4" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const KeyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="15.5" r="4" />
    <path d="m10.5 12.5 8-8M16 7l2.5 2.5M19 4l2 2" />
  </Svg>
);

export const DogIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5 6.5 4l2 3M20 6.5 17.5 4l-2 3" />
    <path d="M5.5 10a6.5 6.5 0 0 1 13 0v4.5A5.5 5.5 0 0 1 13 20h-2a5.5 5.5 0 0 1-5.5-5.5Z" />
    <path d="M10 12h.01M14 12h.01M11 16h2" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 22 20H2Z" />
    <path d="M12 9.5v4.5M12 17h.01" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CloudOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 18A4.5 4.5 0 0 1 6 9.06 6.5 6.5 0 0 1 17.5 7.4 4.6 4.6 0 0 1 20 16" />
    <path d="m3 3 18 18" />
  </Svg>
);

export const SprayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 8h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <path d="M10 8V4h4v4M17 5h2M17 8h3M18 2h2" />
  </Svg>
);
