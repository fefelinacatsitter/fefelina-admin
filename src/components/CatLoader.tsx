interface CatLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'walking' | 'paws' | 'sleeping'
  text?: string
}

export default function CatLoader({ 
  size = 'md', 
  variant = 'walking',
  text = 'Carregando...' 
}: CatLoaderProps) {
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  }

  if (variant === 'walking') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className={`${sizeClasses[size]} relative`}>
          {/* Corpo do gato */}
          <div className="absolute inset-0 animate-cat-walk">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cabeça */}
              <circle cx="50" cy="35" r="15" fill="#FF8C42" />
              {/* Orelhas */}
              <path d="M 40 25 L 35 15 L 45 20 Z" fill="#FF8C42" />
              <path d="M 60 25 L 65 15 L 55 20 Z" fill="#FF8C42" />
              {/* Orelhas internas */}
              <path d="M 40 24 L 37 18 L 43 21 Z" fill="#FFB380" />
              <path d="M 60 24 L 63 18 L 57 21 Z" fill="#FFB380" />
              {/* Olhos */}
              <circle cx="45" cy="35" r="2" fill="#000" className="animate-blink" />
              <circle cx="55" cy="35" r="2" fill="#000" className="animate-blink" />
              {/* Nariz */}
              <circle cx="50" cy="40" r="1.5" fill="#FF6B9D" />
              {/* Bigodes */}
              <line x1="35" y1="40" x2="28" y2="39" stroke="#000" strokeWidth="0.5" />
              <line x1="35" y1="42" x2="28" y2="43" stroke="#000" strokeWidth="0.5" />
              <line x1="65" y1="40" x2="72" y2="39" stroke="#000" strokeWidth="0.5" />
              <line x1="65" y1="42" x2="72" y2="43" stroke="#000" strokeWidth="0.5" />
              {/* Corpo */}
              <ellipse cx="50" cy="60" rx="18" ry="22" fill="#FF8C42" />
              {/* Barriga */}
              <ellipse cx="50" cy="62" rx="12" ry="15" fill="#FFB380" />
              {/* Cauda */}
              <path 
                d="M 68 55 Q 80 50 85 60" 
                stroke="#FF8C42" 
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round"
                className="animate-tail-wag"
              />
              {/* Pernas */}
              <rect x="40" y="75" width="4" height="12" rx="2" fill="#FF8C42" className="animate-leg-left" />
              <rect x="56" y="75" width="4" height="12" rx="2" fill="#FF8C42" className="animate-leg-right" />
              {/* Patinhas */}
              <circle cx="42" cy="87" r="2.5" fill="#FFB380" className="animate-leg-left" />
              <circle cx="58" cy="87" r="2.5" fill="#FFB380" className="animate-leg-right" />
            </svg>
          </div>
        </div>
        {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
      </div>
    )
  }

  if (variant === 'paws') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-paw-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                {/* Almofada principal */}
                <ellipse cx="15" cy="18" rx="8" ry="7" fill="#FF8C42" />
                {/* Dedos */}
                <circle cx="10" cy="10" r="3" fill="#FF8C42" />
                <circle cx="15" cy="8" r="3" fill="#FF8C42" />
                <circle cx="20" cy="10" r="3" fill="#FF8C42" />
                {/* Detalhes almofada */}
                <ellipse cx="15" cy="18" rx="5" ry="4" fill="#FFB380" />
              </svg>
            </div>
          ))}
        </div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    )
  }

  if (variant === 'sleeping') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className={`${sizeClasses[size]} relative`}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Corpo enroladinho */}
            <circle cx="50" cy="55" r="25" fill="#FF8C42" className="animate-breathing" />
            {/* Barriga */}
            <circle cx="50" cy="55" r="18" fill="#FFB380" className="animate-breathing" />
            {/* Cabeça */}
            <circle cx="40" cy="40" r="12" fill="#FF8C42" className="animate-breathing" />
            {/* Orelhas */}
            <path d="M 35 30 L 30 22 L 38 28 Z" fill="#FF8C42" />
            <path d="M 45 30 L 50 22 L 42 28 Z" fill="#FF8C42" />
            {/* Orelhas internas */}
            <path d="M 35 29 L 32 24 L 37 28 Z" fill="#FFB380" />
            <path d="M 45 29 L 48 24 L 43 28 Z" fill="#FFB380" />
            {/* Olhos fechados */}
            <path d="M 35 40 Q 37 42 39 40" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 41 40 Q 43 42 45 40" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Nariz */}
            <circle cx="40" cy="44" r="1" fill="#FF6B9D" />
            {/* ZZZ */}
            <text x="65" y="25" className="animate-zzz" fill="#999" fontSize="8" fontWeight="bold">Z</text>
            <text x="70" y="20" className="animate-zzz" fill="#999" fontSize="10" fontWeight="bold" style={{ animationDelay: '0.3s' }}>Z</text>
            <text x="76" y="15" className="animate-zzz" fill="#999" fontSize="12" fontWeight="bold" style={{ animationDelay: '0.6s' }}>Z</text>
            {/* Cauda */}
            <path 
              d="M 70 65 Q 80 70 75 80" 
              stroke="#FF8C42" 
              strokeWidth="8" 
              fill="none" 
              strokeLinecap="round"
            />
          </svg>
        </div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    )
  }

  return null
}
