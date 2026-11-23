export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#D97706" />
      <path
        d="M36 15v22a8 8 0 0 1-16 0v-3"
        fill="none"
        stroke="#12281D"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m16 38 4-5 4 5" fill="none" stroke="#12281D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="15" r="2.6" fill="#12281D" />
    </svg>
  );
}
