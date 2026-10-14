/** Logo: pelota de vóley amarilla con la banda azul curva de las pelotas oficiales. */
export function BallLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id="logo-ball"><circle cx="32" cy="32" r="30"/></clipPath>
        <radialGradient id="logo-shade" cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35"/>
          <stop offset="0.45" stopColor="#fff" stopOpacity="0"/>
          <stop offset="0.8" stopColor="#000" stopOpacity="0.12"/>
          <stop offset="1" stopColor="#000" stopOpacity="0.3"/>
        </radialGradient>
      </defs>
      <g clipPath="url(#logo-ball)">
        <rect width="64" height="64" fill="#F5C400"/>
        <path d="M0 14 C 10 18, 18 25, 28 26 C 38 27, 48 19, 64 16 L 64 32 C 52 34, 40 36, 33 40 C 28 46, 28 56, 31 66 L 16 66 C 18 56, 17 46, 13 39 C 9 33, 5 29, 0 28 Z" fill="#1F3FA6"/>
        <g fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="0.7">
          <path d="M22 26 C 26 16, 34 8, 46 3"/>
          <path d="M33 40 C 42 44, 52 50, 60 60"/>
          <path d="M44 36 C 50 44, 56 46, 64 46"/>
          <path d="M6 30 C 4 40, 6 50, 12 58"/>
          <path d="M40 22 C 42 14, 48 8, 56 6"/>
        </g>
        <circle cx="32" cy="32" r="30" fill="url(#logo-shade)"/>
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#0E1A2B" strokeOpacity="0.35" strokeWidth="1"/>
    </svg>
  );
}
