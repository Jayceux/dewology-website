// The dewdrop outline used to frame photos (CSS: clip-path: url(#dew-drop-clip)).
// Drawn in 0–1 units so it stretches to any frame size.
export default function DropClip() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id="dew-drop-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.5,0 C0.6,0.1 1,0.4 1,0.66 C1,0.87 0.78,1 0.5,1 C0.22,1 0,0.87 0,0.66 C0,0.4 0.4,0.1 0.5,0 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
