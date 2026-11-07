// Inline SVG icons and ship illustrations used by the menus.
const s = (body, size = 22, extra = '') => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" ${extra}>${body}</svg>`;
const stroke = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  play: (z) => s('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>', z, 'fill="currentColor"'),
  back: (z) => s('<path d="M15 5l-7 7 7 7"/>', z, stroke),
  next: (z) => s('<path d="M9 5l7 7-7 7"/>', z, stroke),
  rocket: (z) => s('<path d="M12 2c3 2.5 4.5 6 4.5 10l-2 4h-5l-2-4C7.5 8 9 4.5 12 2z"/><circle cx="12" cy="10" r="2"/><path d="M9.5 16 7 20l3-1M14.5 16 17 20l-3-1"/>', z, stroke),
  lock: (z) => s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', z, stroke),
  pause: (z) => s('<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>', z, 'fill="currentColor"'),
  sound: (z) => s('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>', z, stroke),
  mute: (z) => s('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>', z, stroke),
  up: (z) => s('<path d="M12 4l8.5 10.5h-5V20h-7v-5.5h-5z"/>', z, 'fill="currentColor"'),
  down: (z) => s('<path d="M12 20 3.5 9.5h5V4h7v5.5h5z"/>', z, 'fill="currentColor"'),
  gauge: (z) => s('<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-5"/>', z, stroke),
  star: (z, fill = '#FFC93C', strokeCol = '#FFE7A0') => s(`<path d="M12 1.8l3 6.5 7.1.8-5.3 4.8 1.5 7-6.3-3.6-6.3 3.6 1.5-7L1.9 9.1 9 8.3z" fill="${fill}" stroke="${strokeCol}" stroke-width="0.8"/>`, z),
  coin: (z) => s('<circle cx="12" cy="12" r="11" fill="#FFC93C"/><circle cx="12" cy="12" r="8" fill="#FFB000"/><path d="M12 6.5 L13.6 10 L17.3 10.3 L14.5 12.7 L15.4 16.4 L12 14.4 L8.6 16.4 L9.5 12.7 L6.7 10.3 L10.4 10 Z" fill="#FFF3B0"/>', z),
  heart: (z, on) => `<svg aria-hidden="true" width="${z}" height="${z}" viewBox="0 0 24 22"><path d="M12 21s-8.5-5.3-10.6-10.2C-0.2 6.9 2.3 2 6.6 2c2.4 0 4.1 1.4 5.4 3.2C13.3 3.4 15 2 17.4 2c4.3 0 6.8 4.9 5.2 8.8C20.5 15.7 12 21 12 21z" fill="${on ? '#FF4D6D' : 'rgba(255,255,255,0.15)'}" stroke="${on ? '#FFD0DA' : 'rgba(255,255,255,0.4)'}" stroke-width="1.5"/></svg>`
};

const shipSvg = (inner, w) => `<svg aria-hidden="true" width="${w}" height="${w / 2}" viewBox="0 0 200 100">${inner}</svg>`;
// Shared bits: vertical shading gradient, engine flame, round window with a glint.
const shade = (id, top, mid, bot) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.45" stop-color="${mid}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
const flame = (x, y, len = 34, h = 12) => `<path d="M${x} ${y - h} C${x - len * 0.5} ${y - h} ${x - len * 0.8} ${y - 3} ${x - len} ${y} C${x - len * 0.8} ${y + 3} ${x - len * 0.5} ${y + h} ${x} ${y + h} Z" fill="#FF8A3C"/><path d="M${x} ${y - h * 0.55} C${x - len * 0.3} ${y - h * 0.5} ${x - len * 0.5} ${y - 2} ${x - len * 0.62} ${y} C${x - len * 0.5} ${y + 2} ${x - len * 0.3} ${y + h * 0.5} ${x} ${y + h * 0.55} Z" fill="#FFF2B0"/>`;
const porthole = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1C2C78" stroke="#DDE4F4" stroke-width="${r * 0.35}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="#fff"/>`;

export const SHIP_ART = {
  cub: (w) => shipSvg(`${shade('gCub', '#FFFFFF', '#E8EEFF', '#A9B4D6')}${shade('gCubR', '#FF8FA3', '#FF4D6D', '#B8304E')}
    ${flame(30, 50)}
    <path d="M70 36 C58 30 50 14 42 8 L30 8 C36 18 38 30 44 38 Z" fill="url(#gCubR)"/><path d="M70 64 C58 70 50 86 42 92 L30 92 C36 82 38 70 44 62 Z" fill="url(#gCubR)"/>
    <path d="M30 38 L42 34 V66 L30 62 Z" fill="#2A3150"/>
    <path d="M42 33 H124 C150 33 176 40 194 50 C176 60 150 67 124 67 H42 C38 60 38 40 42 33 Z" fill="url(#gCub)"/>
    <path d="M124 33 C150 33 176 40 194 50 C176 60 150 67 124 67 C130 56 130 44 124 33 Z" fill="url(#gCubR)"/>
    <rect x="120" y="33" width="5" height="34" fill="#FFC93C"/><rect x="82" y="32" width="12" height="36" fill="url(#gCubR)"/><rect x="54" y="34" width="5" height="32" fill="#FFC93C"/>
    ${porthole(106, 48, 10)}${porthole(68, 50, 5)}`, w),
  saucer: (w) => shipSvg(`${shade('gSau', '#C6B6FF', '#8B6CFF', '#4E3AA8')}
    ${flame(26, 60, 24, 8)}
    <circle cx="100" cy="30" r="13" fill="#7DFF9A"/><path d="M93 18 L89 6 M107 18 L111 6" stroke="#7DFF9A" stroke-width="2.5"/><circle cx="89" cy="6" r="3" fill="#FF4D6D"/><circle cx="111" cy="6" r="3" fill="#FF4D6D"/>
    <circle cx="95" cy="30" r="4.5" fill="#fff"/><circle cx="105" cy="30" r="4.5" fill="#fff"/><circle cx="95.5" cy="31" r="2.4" fill="#10142A"/><circle cx="104.5" cy="31" r="2.4" fill="#10142A"/>
    <path d="M70 52 C70 14 130 14 130 52 Z" fill="#A8F4FF" opacity="0.35" stroke="#DFFBFF" stroke-width="1.5"/>
    <ellipse cx="100" cy="62" rx="62" ry="5" fill="#3EE6FF" opacity="0.5"/>
    <path d="M16 56 C40 44 160 44 184 56 C160 76 40 76 16 56 Z" fill="url(#gSau)"/><ellipse cx="100" cy="56" rx="84" ry="5" fill="#F2F5FF"/>
    <rect x="70" y="50" width="60" height="4" rx="2" fill="#FFC93C"/>
    ${[38, 62, 86, 114, 138, 162].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 5 ? 63 : 66}" r="4.5" fill="${i % 2 ? '#FF4D6D' : '#FFC93C'}"/>`).join('')}`, w),
  racer: (w) => shipSvg(`${shade('gRac', '#FFE7A0', '#FFC93C', '#C98A10')}
    ${flame(26, 50, 30, 9)}
    <path d="M104 42 L72 4 L56 4 L60 42 Z" fill="#B88A2A"/><path d="M104 58 L72 96 L56 96 L60 58 Z" fill="#9A7020"/>
    <path d="M78 12 L72 4 L56 4 L57 12 Z" fill="#FF4D6D"/><path d="M78 88 L72 96 L56 96 L57 88 Z" fill="#FF4D6D"/>
    <circle cx="62" cy="3" r="3" fill="#FF4D6D"/><circle cx="62" cy="97" r="3" fill="#2BFF88"/>
    <path d="M26 41 L36 38 V62 L26 59 Z" fill="#2A3150"/>
    <path d="M36 38 C70 34 120 36 146 40 C170 43 188 47 198 50 C188 53 170 57 146 60 C120 64 70 66 36 62 Z" fill="url(#gRac)"/>
    <path d="M150 41 C172 44 188 47 198 50 C188 53 172 56 150 59 Z" fill="#FF4D6D"/><rect x="148" y="40" width="3" height="20" fill="#fff"/>
    <ellipse cx="124" cy="40" rx="22" ry="8" fill="#1C2C78" stroke="#DDE4F4" stroke-width="2"/><ellipse cx="116" cy="37" rx="6" ry="2" fill="#fff" opacity="0.8"/>
    <path d="M44 50 H110" stroke="#FF4D6D" stroke-width="3" stroke-linecap="round"/><rect x="74" y="54" width="22" height="6" rx="3" fill="#2A3150"/>`, w),
  hauler: (w) => shipSvg(`${shade('gHau', '#8DF0B8', '#3DDC84', '#21985A')}
    ${flame(24, 50, 22, 14)}
    <path d="M24 30 L36 32 V46 L24 48 Z M24 52 L36 54 V68 L24 70 Z" fill="#2A3150"/>
    <rect x="58" y="14" width="26" height="16" rx="3" fill="#FF8A3C"/><rect x="69" y="14" width="4" height="16" fill="#2A3150"/>
    <rect x="88" y="14" width="26" height="16" rx="3" fill="#3EE6FF"/><rect x="99" y="14" width="4" height="16" fill="#2A3150"/>
    <path d="M150 20 V8" stroke="#DDE4F4" stroke-width="2"/><circle cx="150" cy="7" r="3" fill="#FF4D6D"/>
    <path d="M60 78 V86 M110 78 V86" stroke="#2A3150" stroke-width="5"/><rect x="50" y="85" width="72" height="5" rx="2.5" fill="#DDE4F4"/>
    <rect x="36" y="28" width="104" height="52" rx="12" fill="url(#gHau)"/>
    <rect x="46" y="38" width="24" height="28" rx="3" fill="#F2F5FF"/><rect x="78" y="38" width="24" height="28" rx="3" fill="#F2F5FF"/>
    <rect x="46" y="70" width="70" height="3" rx="1.5" fill="#3EE6FF"/>
    <circle cx="160" cy="54" r="30" fill="#F2F5FF"/><rect x="128" y="26" width="10" height="56" rx="3" fill="#FFC93C"/>
    <path d="M160 36 H176 C184 38 188 44 189 50 H162 C160 46 159 40 160 36 Z" fill="#1C2C78"/><circle cx="168" cy="41" r="2" fill="#fff"/>
    <circle cx="188" cy="62" r="4" fill="#FFF2B0"/>`, w)
};

// Colors for the star-map planet buttons.
export const PLANET_LOOK = {
  moon: ['#E6EAF4', '#7E86A0'], mars: ['#FFA474', '#A8341A'], belt: ['#C2A88C', '#54412F'], jupiter: ['#F7D2A8', '#A8622E'],
  saturn: ['#FFE6B0', '#C08A34'], uranus: ['#B4F6F4', '#2F9CB0'], neptune: ['#8EB2FF', '#2440B0'], blackhole: ['#5A3A10', '#000000']
};
