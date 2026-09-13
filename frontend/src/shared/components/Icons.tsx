import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Ícones em SVG inline — evitamos dependência externa apenas para desenho. */

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  );
}

export function ClientsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11a3 3 0 1 0 0-6" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.87" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  );
}

export function SubscriptionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16v13H4z" />
      <path d="M4 11h16M9 15h6" />
      <path d="M8 7V4h8v3" />
    </Icon>
  );
}

export function FinancialIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18v12H3z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9v.01M17 15v.01" />
    </Icon>
  );
}

export function ProtocolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6M10 17h4" />
    </Icon>
  );
}

export function ExamIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3h6v4l3.5 6.5A4 4 0 0 1 14.6 20H9.4a4 4 0 0 1-3.9-6.5L9 7z" />
      <path d="M6.8 15h10.4" />
    </Icon>
  );
}

/** Lista de itens com marcador — catálogo de procedimentos. */
export function ProcedureIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4h9a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M6 8H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" />
      <path d="M11 9h5M11 13h5M11 17h3" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}
