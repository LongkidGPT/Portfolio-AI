export function ExperienceSection({ items }) {
  return (
    <section
      className="section experience"
      id="experience"
      data-track-section
      data-track-label="EXPERIENCE"
    >
      <div className="shell">
        <p className="section-label">
          <span>03</span>
          EXPERIENCE
        </p>

        <div className="experience__layout">
          <header className="experience__intro">
            <h2>
              Across Brand,
              <br />
              Product and Market
            </h2>
            <h3>Kid（龙昊翔） · 人类 · 资深视觉设计师</h3>
            <p>10+ 年消费科技、品牌视觉、上市传播与多触点设计经验。</p>
          </header>

          <div className="experience-list">
            {items.map((item) => (
              <div className="experience-row" key={item.company}>
                <span>{item.company}</span>
                <span>{item.role}</span>
                <time>{item.period}</time>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
