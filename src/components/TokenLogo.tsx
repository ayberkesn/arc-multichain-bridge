import { useState } from 'react';
import { getTokenLogoPath } from '../utils/tokenLogos';
import type { TokenSymbol } from '../hooks/useDEX';

export interface TokenLogoProps {
  token: TokenSymbol | string; // Accept both TokenSymbol and string
  size?: number;
  className?: string;
  fallback?: string; // fallback text if image fails to load
}

export default function TokenLogo({ token, size = 32, className = '', fallback }: TokenLogoProps) {
  const [imageError, setImageError] = useState(false);
  // Normalize token to uppercase string for lookup
  const normalizedToken = (typeof token === 'string' ? token.toUpperCase() : token) as TokenSymbol;
  const logoPath = getTokenLogoPath(normalizedToken);
  const displaySize = `${size}px`;
  
  // Fallback text (first letter of token)
  const fallbackText = fallback || (typeof token === 'string' ? token[0] : token[0]);

  if (imageError || !logoPath) {
    return (
      <div 
        className={`rounded-full bg-orange-500 flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: displaySize, height: displaySize, fontSize: `${size * 0.4}px` }}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div 
      className={`rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
      style={{ width: displaySize, height: displaySize }}
    >
      <img
        src={logoPath}
        alt={token}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

