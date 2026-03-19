export function Logo({ className }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M7 4h10" />
      <path d="M7 20h10" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
      <path d="M9 8l6 3" />
      <path d="M9 13l6 3" />
    </svg>
  );
}
