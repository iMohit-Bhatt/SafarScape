type P = { className?: string };
const s = (className?: string) => ({
  className: className ?? "h-4 w-4",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
});
export const WhatsAppIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6l-4.5.9z" />
  </svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const MenuIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </svg>
);
export const BellIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
  </svg>
);
export const GridIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);
export const MailIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);
export const BagIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="4" y="7" width="16" height="13" rx="1.5" />
    <path d="M9 7V5h6v2M4 12h16" />
  </svg>
);
export const PinIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
export const PenIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M4 20l4-1 11-11-3-3L5 16z" />
  </svg>
);
export const QuoteIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M4 5h16v11H9l-5 4z" />
  </svg>
);
export const ImageIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 17l5-4 4 3 3-2 4 3" />
  </svg>
);
export const TagIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z" />
    <circle cx="8" cy="8.5" r="1.3" />
  </svg>
);
export const ChartIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M4 20h16M7 16v-4M12 16V8M17 16v-6" />
  </svg>
);
export const UsersIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
  </svg>
);
export const HomeIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M4 11l8-7 8 7v9H4z" />
  </svg>
);
export const ExternalIcon = ({ className }: P) => (
  <svg {...s(className ?? "h-3 w-3")}>
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);
export const ChevronDown = ({ className }: P) => (
  <svg {...s(className ?? "h-3.5 w-3.5")}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const LockIcon = ({ className }: P) => (
  <svg {...s(className)}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);
