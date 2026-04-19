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
    <path d="M9.5 6h5" />
    <path d="M5.75 8h12.5" />
    <path d="m8 8 .72 10.1a1.55 1.55 0 0 0 1.55 1.4h3.46a1.55 1.55 0 0 0 1.55-1.4L16 8" />
    <path d="M10.25 11v5M13.75 11v5" />
  </svg>
)

export const PinIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m14.7 4.75 4.55 4.55" />
    <path d="m8.95 9.35 5.75-5.75 5.7 5.7-5.75 5.75" />
    <path d="m7.95 10.75 5.3 5.3" />
    <path d="m5 19 5.35-5.35" />
  </svg>
)

export const PlusIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5.75v12.5M5.75 12h12.5" />
  </svg>
)

export const CheckLogoIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" />
    <path d="M9 16.5 14 21l9-11" />
  </svg>
)
