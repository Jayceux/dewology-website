// A requirement badge: the first part goes in a filled pill.
//   "CT#2 First brand post"        → [CT#2] First brand post
//   "Business concept: Our history" → [Business concept] Our history
// Pass the label text from content.js; anything else is shown as plain
// badge text.
export default function CtBadge({ label, className = '' }) {
  const match = /^(CT#\d+)\s*(.*)$/.exec(label) || /^([^:]+):\s*(.+)$/.exec(label);
  return (
    <p className={`ct-badge ${className}`}>
      {match ? (
        <>
          <span className="ct-badge__num">{match[1]}</span>
          {/* so screen readers pause between the two parts */}
          <span className="visually-hidden">: </span>
          <span>{match[2]}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </p>
  );
}
