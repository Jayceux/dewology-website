import { CROPS, SKETCHES } from '../lib/sketchCrops';

// Shows one draft cut out of an original sketch file (pure CSS crop).
export default function SketchCrop({ id, className = '' }) {
  const crop = CROPS[id];
  const sheet = SKETCHES[crop.sketch];
  const [x, y, w, h] = crop.box;
  return (
    <div className={`sketch-crop ${className}`} style={{ aspectRatio: `${w} / ${h}`, '--ratio': w / h, background: sheet.paper }}>
      <img
        src={sheet.src}
        alt={crop.alt}
        loading="lazy"
        decoding="async"
        style={{
          position: 'absolute',
          width: `${(sheet.w / w) * 100}%`,
          maxWidth: 'none',
          left: `${(-x / w) * 100}%`,
          top: `${(-y / h) * 100}%`,
        }}
      />
    </div>
  );
}
