import './ChapterCard.css';

// The full-screen card that opens a chapter: a giant outline number, the
// title, and what the chapter shows (the requirement it answers, such as
// "CT#1", shows in the corner counter on every frame of the chapter). When
// the stage runs, the dewdrop falls onto the title and the words spread out
// from where it lands (see src/stage and ChapterCard.css).
//   id       the stop's id (the stage keys its light, water and drop on it)
//   chapter  one entry of `chapters` in content.js
export default function ChapterCard({ id, chapter }) {
  return (
    <header className="chapter frame" id={id} data-stop="" aria-labelledby={`${id}-title`}>
      <span className="chapter__num" aria-hidden="true">
        {chapter.number}
      </span>
      <div className="chapter__words">
        <h2 className="chapter__title" id={`${id}-title`}>
          {chapter.title}
        </h2>
        <ol className="chapter__contents" aria-label="In this chapter">
          {chapter.contents.map((item, i) => (
            <li key={item} style={{ '--i': i }}>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
