import { uiLinks } from "@/lib/ui-links";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <section className="footer-main">
        <div>
          <strong>Private Onchain Stocks</strong>
          <p>Confidential multi-asset DeFi for stocks, crypto, commodities, and stablecoins.</p>
          <small>Built for iExec Vibe Coding Challenge 2025</small>
        </div>
        <nav aria-label="Footer links">
          <a href={uiLinks.github} rel="noreferrer" target="_blank">GitHub</a>
          <a href={uiLinks.demo} rel="noreferrer" target="_blank">Demo</a>
          <a href={uiLinks.docs} rel="noreferrer" target="_blank">Docs</a>
          <a href={uiLinks.arbiscan} rel="noreferrer" target="_blank">Arbiscan</a>
          <a href={uiLinks.discord} rel="noreferrer" target="_blank">Discord</a>
        </nav>
        <div className="partner-logos" aria-label="Partners">
          <span>iExec</span>
          <span>ChainGPT</span>
          <span>TUM Blockchain</span>
          <span>Arbitrum</span>
        </div>
      </section>
      <div className="footer-license">MIT License · Confidential assets on Arbitrum Sepolia</div>
    </footer>
  );
}
