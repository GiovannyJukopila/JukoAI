const ITEMS = ["Angular", "Flutter", "Node.js", "Python", "AWS", "Firebase", "AI Agents", "Automatización", ".NET", "React", "PostgreSQL", "CI/CD"];

// The loop is a CSS animation (.marquee__track): it runs on the compositor, so it costs the main
// thread nothing while the page scrolls, and it stops for reduced motion with the global rule.
export function Marquee() {
  const row = [...ITEMS, ...ITEMS];

  return (
    <section className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "2.2rem" }}>
            {item}
            <i>·</i>
          </span>
        ))}
      </div>
    </section>
  );
}
