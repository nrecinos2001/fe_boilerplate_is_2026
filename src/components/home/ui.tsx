import Image from "next/image";
import type { ReactNode } from "react";

type ArrowVariant = "light" | "dark" | "lime" | "lime-lg";

const ARROWS: Record<ArrowVariant, { src: string; size: number }> = {
  light: { src: "/home/arrow-up-right.svg", size: 20 },
  dark: { src: "/home/arrow-up-right-dark.svg", size: 20 },
  lime: { src: "/home/arrow-up-right-coach.svg", size: 20 },
  "lime-lg": { src: "/home/arrow-up-right-lg.svg", size: 28 },
};

interface ArrowUpRightProps {
  variant?: ArrowVariant;
  className?: string;
}

export function ArrowUpRight({ variant = "light", className }: ArrowUpRightProps) {
  const { src, size } = ARROWS[variant];
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`shrink-0 ${className ?? ""}`}
    />
  );
}

interface SectionLabelProps {
  children: ReactNode;
  tone?: "dark" | "light";
}

export function SectionLabel({ children, tone = "dark" }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`size-1.5 shrink-0 ${tone === "dark" ? "bg-gym-lime" : "bg-gym-ink"}`}
      />
      <p
        className={`font-body text-[11px] font-semibold tracking-[1.6px] ${
          tone === "dark" ? "text-gym-muted" : "text-gym-ink/70"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={`font-display text-[44px] leading-[0.98] font-bold tracking-[-0.8px] sm:text-[56px] lg:text-[68px] ${
        className ?? "text-gym-text"
      }`}
    >
      {children}
    </h2>
  );
}

interface CtaLinkProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}

export function CtaLink({ href, children, variant = "primary", className }: CtaLinkProps) {
  const styles =
    variant === "primary"
      ? "border-transparent bg-gym-lime text-gym-ink hover:bg-[#c3ea45]"
      : "border-gym-line text-gym-text hover:border-gym-muted";
  return (
    <a
      href={href}
      className={`inline-flex h-[54px] items-center justify-center gap-6 border px-6 font-body text-[13px] transition-colors ${styles} ${
        className ?? ""
      }`}
    >
      {children}
      <ArrowUpRight variant={variant === "primary" ? "dark" : "light"} />
    </a>
  );
}

interface PhotoPlaceholderProps {
  label: string;
  className?: string;
}

/** Fondo provisional para las fotografías que aún no se han exportado desde Figma. */
export function PhotoPlaceholder({ label, className }: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,#3a4133_0%,#1a1d18_55%,#111310_100%)] ${
        className ?? ""
      }`}
    />
  );
}

export function GymHubMark({ size = "md" }: { size?: "md" | "lg" }) {
  const bar = size === "md" ? "h-[25px] w-1.5" : "h-[38px] w-2.5";
  return (
    <span className="flex shrink-0 gap-1" aria-hidden>
      <span className={`${bar} bg-gym-lime`} />
      <span className={`${bar} bg-gym-lime`} />
    </span>
  );
}
