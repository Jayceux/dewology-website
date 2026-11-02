// Shared SVG definitions, drawn once for the whole page:
//  - the dewdrop outline used to frame photos (CSS: clip-path: url(#dew-drop-clip)),
//    drawn in 0–1 units so it stretches to any frame size
//  - the outline for the giant numerals (CSS: filter: url(#numeral-outline)).
//    Tracing a glyph's edge with a text stroke also draws the lines where
//    its pieces overlap (Cinzel's "4" is built from overlapping strokes), so
//    instead the solid numeral is grown and shrunk a little and only the
//    ring between the two is kept: one clean outline around the whole shape.
export default function DropClip() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id="dew-drop-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.5,0 C0.6,0.1 1,0.4 1,0.66 C1,0.87 0.78,1 0.5,1 C0.22,1 0,0.87 0,0.66 C0,0.4 0.4,0.1 0.5,0 Z" />
        </clipPath>
        <filter id="numeral-outline" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="grown" />
          <feMorphology in="SourceAlpha" operator="erode" radius="1" result="shrunk" />
          <feComposite in="grown" in2="shrunk" operator="out" result="ring" />
          <feFlood floodColor="#7a2436" floodOpacity="0.24" />
          <feComposite in2="ring" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
