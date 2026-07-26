/* The Bloodfell wordmark, inlined so it ships in the standalone build too.
   IDs are prefixed bf- to avoid clashing with other inline SVG defs. */
const BRAND_LOGO = `<svg class="brand-logo" viewBox="0 0 820 336" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bloodfell">
  <defs>
    <linearGradient id="bf-bone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ece2d0"/>
      <stop offset="0.55" stop-color="#cbbfa9"/>
      <stop offset="1" stop-color="#a4977f"/>
    </linearGradient>
    <linearGradient id="bf-blood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b83c3c"/>
      <stop offset="0.55" stop-color="#8f2626"/>
      <stop offset="1" stop-color="#4e1414"/>
    </linearGradient>
    <linearGradient id="bf-brass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6a4f25"/>
      <stop offset="0.5" stop-color="#c99a4e"/>
      <stop offset="1" stop-color="#6a4f25"/>
    </linearGradient>
    <radialGradient id="bf-glow" cx="0.5" cy="0.46" r="0.62">
      <stop offset="0" stop-color="#2e1521" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#0e0a12" stop-opacity="0"/>
    </radialGradient>
    <filter id="bf-ink" x="-6%" y="-16%" width="112%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="bf-soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="820" height="336" fill="url(#bf-glow)"/>

  <!-- blood: runs from the base of the letters, through the rule, pooling below -->
  <g fill="url(#bf-blood)" filter="url(#bf-ink)">
    <!-- a smeared pool gathering under the mark -->
    <path d="M250,286 q160,26 320,0 q-60,20 -160,20 q-100,0 -160,-20 z" opacity="0.5"/>

    <!-- long runners crossing the brass rule -->
    <path d="M317,214 c-4,20 -5,44 -4,66 a7,7 0 1,0 10,0 c1,-22 0,-46 -6,-66 z"/>
    <path d="M470,214 c-4,26 -5,54 -4,80 a7.5,7.5 0 1,0 11,0 c1,-26 0,-54 -7,-80 z"/>
    <path d="M628,214 c-3,18 -4,42 -3,62 a6.5,6.5 0 1,0 10,0 c1,-20 0,-44 -7,-62 z"/>
    <!-- medium drips -->
    <path d="M232,214 c-3,14 -4,28 -3,40 a5.5,5.5 0 1,0 8,0 c1,-12 0,-26 -5,-40 z"/>
    <path d="M372,214 c-3,16 -4,32 -3,46 a5.5,5.5 0 1,0 8,0 c1,-14 0,-30 -5,-46 z"/>
    <path d="M544,214 c-3,12 -4,26 -3,38 a5,5 0 1,0 8,0 c1,-12 0,-26 -5,-38 z"/>
    <path d="M410,214 c-2,10 -3,20 -2,30 a4.5,4.5 0 1,0 7,0 c1,-10 0,-20 -5,-30 z"/>
    <!-- detached droplets, mid-fall -->
    <path d="M356,296 c-2,6 -3,12 -2,18 a4.5,4.5 0 1,0 6,0 c1,-6 0,-12 -4,-18 z"/>
    <path d="M498,300 c-2,5 -3,11 -2,16 a4,4 0 1,0 6,0 c1,-5 0,-11 -4,-16 z"/>
    <path d="M585,290 c-2,6 -3,12 -2,17 a4,4 0 1,0 6,0 c1,-6 0,-11 -4,-17 z"/>
    <circle cx="320" cy="322" r="3.6"/>
    <circle cx="472" cy="318" r="4"/>
    <circle cx="631" cy="308" r="3.2"/>
    <circle cx="266" cy="284" r="2.6"/>
    <circle cx="410" cy="270" r="2.4"/>
  </g>

  <!-- the wordmark -->
  <g filter="url(#bf-soft)">
    <text x="410" y="196" text-anchor="middle"
          font-family="'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
          font-size="132" font-weight="700" letter-spacing="6"
          fill="url(#bf-bone)" stroke="#120b16" stroke-width="1.4"
          paint-order="stroke" style="font-variant:small-caps">Bloodfell</text>
  </g>

  <!-- brass rule broken by a blood-drop emblem; blood runs across it -->
  <g transform="translate(410,258)">
    <rect x="-250" y="-1" width="196" height="2" fill="url(#bf-brass)"/>
    <rect x="54" y="-1" width="196" height="2" fill="url(#bf-brass)"/>
    <path d="M0,-14 c-9,14 -13,20 -13,27 a13,13 0 1,0 26,0 c0,-7 -4,-13 -13,-27 z"
          fill="url(#bf-blood)" stroke="#3a1414" stroke-width="1"/>
    <circle cx="0" cy="14" r="3.2" fill="#e0ad63" opacity="0.85"/>
  </g>
</svg>`;
