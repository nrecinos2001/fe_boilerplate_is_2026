import type { ReactNode, SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M12 5v14" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17.6 21.4a2 2 0 0 1-2.8 0L2.6 9.2a2 2 0 0 1 0-2.8l1.4-1.4a2 2 0 0 1 2.8 0L19 17.2a2 2 0 0 1 0 2.8zM21.5 21.5l-1.4-1.4M3.9 3.9 2.5 2.5M6.4 21.4a2 2 0 0 1-2.8-2.8l1.8-1.8a2 2 0 0 1 2.8 2.8zM18.6 8.1a2 2 0 0 1-2.8-2.8l1.8-1.8a2 2 0 0 1 2.8 2.8zM9.1 14.9l5.8-5.8" />
    </Icon>
  );
}

export function LockKeyholeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="16" r="1" />
      <rect x="3" y="10" width="18" height="12" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </Icon>
  );
}

export function DropletsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 16.3c2.2 0 4-1.8 4-4 0-1.2-.6-2.3-1.8-3.3S7.3 6.6 7 5c-.3 1.6-1.2 3.1-2.2 4S3 11.1 3 12.3c0 2.2 1.8 4 4 4z" />
      <path d="M12.6 6.6A11 11 0 0 0 14 3.5c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.9 5" />
    </Icon>
  );
}

export function CoffeeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 2v2M14 2v2M6 2v2" />
      <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
    </Icon>
  );
}
