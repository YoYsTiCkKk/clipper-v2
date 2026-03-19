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
      {/* Dientes de la cuchilla */}
      <path d="M8 2v2" />
      <path d="M10 2v2" />
      <path d="M12 2v2" />
      <path d="M14 2v2" />
      <path d="M16 2v2" />
      
      {/* Base de la cuchilla */}
      <path d="M7 4h10v3H7z" />
      
      {/* Cuerpo de la máquina */}
      <rect x="6" y="7" width="12" height="14" rx="3" />
      
      {/* Botón / Slider de encendido */}
      <line x1="12" y1="12" x2="12" y2="15" />
    </svg>
  );
}
