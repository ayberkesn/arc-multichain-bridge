import type { TokenSymbol } from '../hooks/useDEX';

/**
 * Get the logo path for a token
 * @param token - Token symbol (RAC, RACD, RACA, USDC)
 * @returns Path to the token logo
 */
export function getTokenLogoPath(token: TokenSymbol | string): string {
  const normalizedToken = (typeof token === 'string' ? token.toUpperCase() : token) as TokenSymbol;
  const logoMap: Record<string, string> = {
    USDC: '/usdc.svg',
    RAC: '/rac.png',
    RACD: '/racd.png',
    RACA: '/raca.png',
  };
  
  return logoMap[normalizedToken] || `/rac.png`; // fallback
}

