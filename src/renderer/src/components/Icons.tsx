type IconProps = {
  className?: string
}

export const CloseIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m8.25 8.25 7.5 7.5M15.75 8.25l-7.5 7.5" />
  </svg>
)

export const TrashIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.25 6.25v-.6c0-.85.7-1.55 1.55-1.55h2.4c.85 0 1.55.7 1.55 1.55v.6" />
    <path d="M5.75 7.45h12.5" />
    <path d="m16.95 7.45-.62 10.15a2.05 2.05 0 0 1-2.05 1.93H9.72a2.05 2.05 0 0 1-2.05-1.93L7.05 7.45" />
    <path d="M10.35 10.85v5.45M13.65 10.85v5.45" />
  </svg>
)

export const PinIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path className="pin-head" d="M13.62 3.95a1 1 0 0 1 1.42 0l5.01 5.01a1 1 0 0 1 0 1.42l-1.42 1.42a1.35 1.35 0 0 1-1.42.31l-2.7 2.7c.2.76.01 1.6-.58 2.19l-.45.45-6.93-6.93.45-.45c.59-.59 1.43-.78 2.19-.58l2.7-2.7a1.35 1.35 0 0 1 .31-1.42z" />
    <path className="pin-needle" d="m9.72 14.28-4.47 4.47" />
  </svg>
)

export const PlusIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5.75v12.5M5.75 12h12.5" />
  </svg>
)

export const GripIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="7" r="1.35" />
    <circle cx="15" cy="7" r="1.35" />
    <circle cx="9" cy="12" r="1.35" />
    <circle cx="15" cy="12" r="1.35" />
    <circle cx="9" cy="17" r="1.35" />
    <circle cx="15" cy="17" r="1.35" />
  </svg>
)

export const CheckLogoIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" />
    <path d="M9 16.5 14 21l9-11" />
  </svg>
)
