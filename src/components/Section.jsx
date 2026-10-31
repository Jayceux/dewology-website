// Wraps each part of the page.
//  bg     = the page color while this section is on screen
//  via    = extra colors to blend through on the way in (optional)
//  theme  = 'dark' (light text) or 'light' (dark text)
//  stop   = whether → / Page Down stops here when presenting
//  navId  = which menu link to highlight (defaults to id)
export default function Section({ id, bg, via, theme = 'dark', stop = true, navId, className = '', label, children }) {
  return (
    <section
      id={id}
      data-section=""
      data-nav={navId}
      data-bg={bg}
      data-via={via ? via.join(',') : undefined}
      data-theme={theme}
      data-stop={stop ? '' : undefined}
      aria-label={label}
      className={`section ${className}`}
    >
      {children}
    </section>
  );
}
