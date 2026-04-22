export default function JudgeProofLoading() {
  return (
    <main className="page">
      <section className="section">
        <div className="row">
          <div>
            <h1>Judge Proof</h1>
            <p className="muted">Loading live Arbitrum Sepolia proof data...</p>
          </div>
          <span className="status-dot neutral">Loading</span>
        </div>
        <div className="metric-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="metric" key={index}>
              <span className="muted">Loading</span>
              <strong>...</strong>
              <p className="muted">Fetching live chain state</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
