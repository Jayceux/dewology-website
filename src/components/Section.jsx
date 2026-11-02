// Wraps each part of the page. Sections paint nothing themselves: the
// watercolour stage behind the page is the paper (see src/stage).
//  stop   = whether → / Page Down stops here when presenting
//  navId  = which menu link to highlight (defaults to id)
export default function Section({ id, stop = true, navId, className = '', label, children }) {
  return (
    <section
      id={id}
      data-section=""
      data-nav={navId}
      data-stop={stop ? '' : undefined}
      aria-label={label}
      className={`section ${className}`}
    >
      {children}
    </section>
  );
}
