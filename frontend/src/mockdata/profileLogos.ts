const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const profileLogos = {
  arnav: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c0c1ff"/>
          <stop offset="100%" stop-color="#8083ff"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <circle cx="32" cy="32" r="22" fill="url(#g)" opacity="0.9"/>
      <path d="M24 40V24h4l8 10V24h4v16h-4l-8-10v10z" fill="#07006c"/>
    </svg>
  `),
  Ashwin: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <rect x="16" y="16" width="32" height="32" rx="12" fill="#7bd0ff"/>
      <rect x="24" y="24" width="16" height="16" rx="5" fill="#00354a"/>
    </svg>
  `),
  yevhen: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <path d="M32 12l16 10v20L32 52 16 42V22z" fill="#ffb783"/>
      <path d="M32 22l7 4v12l-7 4-7-4V26z" fill="#452000"/>
    </svg>
  `),
  miller: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <rect x="16" y="16" width="32" height="32" rx="12" fill="#7bd0ff"/>
      <rect x="24" y="24" width="16" height="16" rx="5" fill="#00354a"/>
    </svg>
  `),
  BruhGunned: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <circle cx="32" cy="32" r="18" fill="#d97721"/>
      <path d="M32 18l4.4 8.9 9.8 1.4-7.1 6.9 1.7 9.8L32 40.4 23.2 45l1.7-9.8-7.1-6.9 9.8-1.4z" fill="#452000"/>
    </svg>
  `),
  Shreyan: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#171f33"/>
      <path d="M32 12l16 10v20L32 52 16 42V22z" fill="#ffb783"/>
      <path d="M32 22l7 4v12l-7 4-7-4V26z" fill="#452000"/>
    </svg>
  `),
} as const;
