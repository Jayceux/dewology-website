import Wordmark from './Wordmark';
import './FontSpecimen.css';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';

// Live type specimens: the sample is real text in the real font, and
// visitors can click it and type their own words.
//  items: [{ name, role, sample, family?, weight?, italic?, fromLogo?, note? }]
export default function FontSpecimen({ items, className = '' }) {
  return (
    <ul className={`specimens ${className}`}>
      {items.map((f) => (
        <li key={f.name} className="specimen">
          <div className="specimen__meta">
            <span className="specimen__name">{f.name}</span>
            <span className="specimen__role">{f.role}</span>
          </div>
          {f.fromLogo ? (
            <figure className="specimen__logo">
              <Wordmark className="specimen__wordmark" label={`${f.sample} wordmark set in ${f.name}`} />
              {f.note && <figcaption className="specimen__note">{f.note}</figcaption>}
            </figure>
          ) : (
            <>
              <p
                className="specimen__sample"
                style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight || 400, fontStyle: f.italic ? 'italic' : 'normal' }}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label={`${f.name} sample, editable`}
              >
                {f.sample}
              </p>
              <p
                className="specimen__glyphs"
                style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight || 400, fontStyle: f.italic ? 'italic' : 'normal' }}
                aria-hidden="true"
              >
                {GLYPHS}
              </p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
