import { CopyButton } from "./CopyButton.jsx";
import { footerTagline } from "./portfolio-data.js";

export function ContactSection() {
  return (
    <section
      className="contact"
      id="contact"
      data-track-section
      data-track-label="LET’S TALK"
    >
      <div className="contact__content">
        <h2>LET&apos;S TALK</h2>
        <p className="contact__details">
          <a href="mailto:long.kidq@gmail.com">
            E-mail：long.kidq@gmail.com
          </a>
          <span aria-hidden="true">|</span>
          <CopyButton
            className="contact__copy-link"
            value="LKchat1980"
            label="Wechat：LKchat1980"
            copiedLabel="已复制微信号"
            trackLabel="Wechat: LKchat1980"
          />
          <span aria-hidden="true">|</span>
          <a href="tel:+8618520224719">Mobile：18520224719</a>
        </p>
        <CopyButton
          className="button button--light contact__button"
          value="long.kidq@gmail.com"
          label="start a conversation"
          copiedLabel="已复制邮箱"
          trackLabel="start a conversation"
          actionLabel="复制邮箱地址"
          showArrow
        />
      </div>
      <footer className="footer">
        <span>© 2026 Kid Long · 龙昊翔</span>
        <span>{footerTagline}</span>
      </footer>
    </section>
  );
}
