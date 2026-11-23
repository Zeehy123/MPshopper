// Hand-drawn produce, defined once and reused. Colours come from CSS variables,
// so the pale backdrop and the bold login illustration share the same shapes.
export function ProduceSymbols() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="g-leaf" viewBox="0 0 100 100">
          <path d="M50 96C18 72 12 38 50 4c38 34 32 68 0 92z" fill="var(--g-leaf, #bcdaae)" />
          <path d="M50 94V16" stroke="var(--g-vein, #9fc68e)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </symbol>

        <symbol id="g-sprig" viewBox="0 0 100 100">
          <path d="M50 99C50 70 52 40 50 10" stroke="var(--g-stem, #93c283)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <use href="#g-leaf" x="12" y="54" width="38" height="38" transform="rotate(-42 31 73)" />
          <use href="#g-leaf" x="50" y="42" width="38" height="38" transform="rotate(42 69 61)" />
          <use href="#g-leaf" x="14" y="28" width="34" height="34" transform="rotate(-36 31 45)" />
          <use href="#g-leaf" x="52" y="16" width="34" height="34" transform="rotate(36 69 33)" />
          <use href="#g-leaf" x="33" y="0" width="34" height="36" />
        </symbol>

        <symbol id="g-tomato" viewBox="0 0 100 100">
          <path d="M50 24c-22 0-39 14-39 34s17 32 39 32 39-12 39-32S72 24 50 24z" fill="var(--g-tomato, #f1b4a5)" />
          <ellipse cx="32" cy="48" rx="9" ry="5" transform="rotate(-35 32 48)" fill="#fff" opacity=".4" />
          <path d="M50 30c-6 0-12 1-18 5 5 1 9 3 11 7 2-3 5-5 7-5s5 2 7 5c2-4 6-6 11-7-6-4-12-5-18-5z" fill="var(--g-calyx, #93c283)" />
          <path d="M50 30V16" stroke="var(--g-calyx, #93c283)" strokeWidth="4" strokeLinecap="round" />
        </symbol>

        <symbol id="g-lemon" viewBox="0 0 100 100">
          <ellipse cx="50" cy="54" rx="38" ry="28" fill="var(--g-lemon, #f6da7c)" />
          <circle cx="11" cy="54" r="6" fill="var(--g-lemon, #f6da7c)" />
          <circle cx="89" cy="54" r="6" fill="var(--g-lemon, #f6da7c)" />
          <ellipse cx="36" cy="44" rx="10" ry="4" transform="rotate(-20 36 44)" fill="#fff" opacity=".4" />
          <use href="#g-leaf" x="46" y="12" width="26" height="26" transform="rotate(50 59 25)" />
        </symbol>

        <symbol id="g-apple" viewBox="0 0 100 100">
          <path d="M50 32c-8-7-35-6-37 22-2 27 16 40 28 40 5 0 6-2 9-2s4 2 9 2c12 0 30-13 28-40-2-28-29-29-37-22z" fill="var(--g-apple, #edb9aa)" />
          <ellipse cx="30" cy="52" rx="7" ry="11" transform="rotate(20 30 52)" fill="#fff" opacity=".35" />
          <path d="M50 32c0-8 2-14 7-20" stroke="var(--g-stem, #93c283)" strokeWidth="4" fill="none" strokeLinecap="round" />
          <use href="#g-leaf" x="52" y="6" width="26" height="26" transform="rotate(60 65 19)" />
        </symbol>

        <symbol id="g-carrot" viewBox="0 0 100 100">
          <path d="M36 34c0-4 4-6 14-6s14 2 14 6c0 10-8 46-14 62C44 80 36 44 36 34z" fill="var(--g-carrot, #f4c18c)" />
          <path d="M42 46h8M50 62h8M46 78h6" stroke="#fff" strokeWidth="2.5" opacity=".45" strokeLinecap="round" />
          <use href="#g-leaf" x="36" y="2" width="20" height="30" transform="rotate(-18 46 17)" />
          <use href="#g-leaf" x="46" y="0" width="20" height="32" transform="rotate(14 56 16)" />
          <use href="#g-leaf" x="41" y="-4" width="18" height="30" />
        </symbol>
      </defs>
    </svg>
  );
}

const place = ({ id, x, y, size, rot = 0 }, i) => (
  <use
    key={i}
    href={`#g-${id}`}
    x={x}
    y={y}
    width={size}
    height={size}
    transform={`rotate(${rot} ${x + size / 2} ${y + size / 2})`}
  />
);

const WIDE = [
  { id: "sprig", x: 1150, y: -30, size: 300, rot: 18 },
  { id: "tomato", x: -40, y: 600, size: 230, rot: -14 },
  { id: "lemon", x: 1190, y: 620, size: 240, rot: 14 },
  { id: "carrot", x: -30, y: 40, size: 210, rot: 32 },
  { id: "apple", x: 600, y: 730, size: 170, rot: 8 },
  { id: "sprig", x: 300, y: 690, size: 190, rot: -24 },
  { id: "leaf", x: 880, y: -40, size: 140, rot: 160 },
  { id: "lemon", x: 90, y: 340, size: 130, rot: -28 },
  { id: "apple", x: 1250, y: 330, size: 120, rot: -16 },
  { id: "leaf", x: 470, y: -20, size: 100, rot: 200 },
];

const TALL = [
  { id: "sprig", x: 270, y: -40, size: 230, rot: 20 },
  { id: "tomato", x: -60, y: 690, size: 190, rot: -14 },
  { id: "lemon", x: 250, y: 600, size: 190, rot: 14 },
  { id: "carrot", x: -40, y: 40, size: 150, rot: 32 },
  { id: "apple", x: 170, y: 770, size: 140, rot: 10 },
  { id: "leaf", x: 150, y: -30, size: 90, rot: 190 },
];

// Pale produce that sits behind every screen. Decorative only.
export default function Botanicals() {
  return (
    <div className="backdrop" aria-hidden="true">
      <ProduceSymbols />
      <svg className="backdrop-wide" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {WIDE.map(place)}
      </svg>
      <svg className="backdrop-tall" viewBox="0 0 420 900" preserveAspectRatio="xMidYMid slice">
        {TALL.map(place)}
      </svg>
    </div>
  );
}

// Bold basket for the login screen.
export function BasketHero() {
  return (
    <svg className="basket-hero" viewBox="0 0 340 280" role="img" aria-label="A basket of fresh produce">
      <path d="M62 126C62 28 278 28 278 126" fill="none" stroke="#b9894f" strokeWidth="11" strokeLinecap="round" />
      <g>
        <use href="#g-carrot" x="206" y="-6" width="112" height="140" transform="rotate(30 262 56)" />
        <use href="#g-sprig" x="104" y="-8" width="108" height="108" />
        <use href="#g-tomato" x="46" y="22" width="114" height="114" transform="rotate(-8 103 79)" />
        <use href="#g-lemon" x="108" y="42" width="104" height="104" />
        <use href="#g-apple" x="170" y="34" width="108" height="108" transform="rotate(8 224 88)" />
      </g>
      <path d="M44 128H296L268 238Q265 252 251 252H89Q75 252 72 238Z" fill="#d9b27a" />
      <g stroke="#bd9459" strokeWidth="3" strokeLinecap="round" opacity=".8">
        <path d="M54 160H286M61 192H279M68 222H272" />
        <path d="M100 130L94 250M150 130L148 252M200 130L202 252M250 130L256 250" opacity=".55" />
      </g>
      <rect x="32" y="112" width="276" height="24" rx="12" fill="#c99a5d" />
    </svg>
  );
}
