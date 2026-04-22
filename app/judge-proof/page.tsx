import { addressUrl, shortAddress } from "@/lib/contracts";
import { getJudgeProofData, isZeroHandle, truncateHash } from "@/lib/judge-proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function JudgeProofPage() {
  try {
    const proof = await getJudgeProofData();

    return (
      <main className="page">
        <section className="section">
          <div className="row">
            <div>
              <h1>Judge Proof</h1>
              <p className="muted">
                Live evidence that the cAAPL confidential stock flow is deployed and executing on Arbitrum Sepolia.
              </p>
            </div>
            <span className="status-dot good">Live chain data</span>
          </div>
          <div className="metric-grid">
            <ProofMetric label="Network" value={proof.networkName} />
            <ProofMetric label="Chain ID" value={String(proof.chainId)} />
            <ProofMetric label="Current total base supply" value={proof.totalBaseSupply} />
            <ProofMetric label="Current total confidential supply" value={proof.totalConfidentialSupply} />
            <ProofMetric label="Wrapped ratio" value={proof.wrappedRatio} />
            <ProofMetric label="Active demo holders" value={String(proof.activeDemoHolders)} />
          </div>
        </section>

        <section className="section">
          <div className="row">
            <div>
              <h2>Contracts</h2>
              <p className="muted">Every address below is the live Arbitrum Sepolia contract used by the cAAPL demo flow.</p>
            </div>
            <span className="status-dot neutral">Arbiscan linked</span>
          </div>
          <div className="metric-grid">
            <AddressCard label="Base token address" address={proof.baseTokenAddress} />
            <AddressCard label="Confidential wrapper address" address={proof.confidentialWrapperAddress} />
            <AddressCard label="Identity registry" address={proof.identityRegistryAddress} />
            <AddressCard label="Compliance contract" address={proof.complianceAddress} />
            <AddressCard label="Nox executor" address={proof.noxExecutorAddress} />
          </div>
        </section>

        <section className="section">
          <div className="row">
            <div>
              <h2>Live Proof</h2>
              <p className="muted">Recent successful transactions pulled from live logs. Nothing here is hardcoded.</p>
            </div>
            <span className="status-dot good">Confirmed transactions</span>
          </div>
          <div className="metric-grid">
            <TransactionCard item={proof.latestMintTx} title="Latest successful mint transaction" />
            <TransactionCard item={proof.latestWrapTx} title="Latest successful wrap transaction" />
            <TransactionCard item={proof.latestConfidentialTransferTx} title="Latest successful confidential transfer transaction" />
          </div>
        </section>

        <section className="section">
          <div className="row">
            <div>
              <h2>Demo Holder State</h2>
              <p className="muted">Known demo investor wallets checked directly against the live identity registry and confidential wrapper.</p>
            </div>
            <span className="status-dot neutral">{proof.demoHolderRows.length} tracked wallets</span>
          </div>
          <div className="stack">
            {proof.demoHolderRows.length === 0 ? (
              <EmptyCard
                title="No demo wallets configured"
                text="Set DEMO_INVESTOR_1 and DEMO_INVESTOR_2 on the server to show explicit seeded investor proof here."
              />
            ) : (
              proof.demoHolderRows.map((holder) => (
                <div className="metric" key={holder.address}>
                  <span className="muted">Demo investor</span>
                  <strong>{shortAddress(holder.address)}</strong>
                  <p>
                    Registry status: {holder.isVerified ? "KYC approved" : "Not approved"} · Encrypted handle:{" "}
                    {isZeroHandle(holder.encryptedHandle) ? "None" : truncateHash(holder.encryptedHandle)}
                  </p>
                  <a href={addressUrl(holder.address)} rel="noreferrer" target="_blank">
                    View wallet on Arbiscan
                  </a>
                  <small>Resolved confidential balance: {holder.confidentialBalance} cAAPL</small>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section">
          <div className="row">
            <div>
              <h2>Public vs Confidential</h2>
              <p className="muted">The page distinguishes what judges can verify publicly from what remains privacy-preserving.</p>
            </div>
            <span className="status-dot neutral">Clarity for judges</span>
          </div>
          <div className="metric-grid">
            <CopyCard title="Public values" lines={proof.publicExplanation} />
            <CopyCard title="How Nox preserves privacy" lines={proof.privacyExplanation} />
          </div>
        </section>

        <section className="section">
          <div className="row">
            <div>
              <h2>What This Proves</h2>
              <p className="muted">This is the hackathon-facing summary of why the demo is functional rather than decorative.</p>
            </div>
            <span className="status-dot good">Evaluation summary</span>
          </div>
          <div className="stack">
            {proof.proofSummary.map((line) => (
              <div className="metric" key={line}>
                <strong>{line}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load judge proof from live chain data.";
    return (
      <main className="page">
        <section className="section">
          <div className="row">
            <div>
              <h1>Judge Proof</h1>
              <p className="muted">Live proof could not be loaded from Arbitrum Sepolia.</p>
            </div>
            <span className="status-dot blocked">Read error</span>
          </div>
          <div className="action-panel">
            <strong>Unable to load live proof</strong>
            <p className="muted">{message}</p>
            <p className="muted">
              This page depends on live RPC reads plus committed deployment artifacts. Check server RPC configuration and deployed contract availability.
            </p>
          </div>
        </section>
      </main>
    );
  }
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AddressCard({ address, label }: { address: string; label: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{shortAddress(address)}</strong>
      <a href={addressUrl(address)} rel="noreferrer" target="_blank">
        View on Arbiscan
      </a>
    </div>
  );
}

function TransactionCard({
  item,
  title,
}: {
  item: { hash: `0x${string}`; label: string; url: string } | null;
  title: string;
}) {
  if (!item) {
    return <EmptyCard title={title} text="No live transaction found yet for this proof step." />;
  }

  return (
    <div className="metric">
      <span className="muted">{title}</span>
      <strong>{truncateHash(item.hash)}</strong>
      <a href={item.url} rel="noreferrer" target="_blank">
        View on Arbiscan
      </a>
    </div>
  );
}

function CopyCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="metric">
      <span className="muted">{title}</span>
      <div className="stack">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="metric">
      <span className="muted">{title}</span>
      <strong>Unavailable</strong>
      <p>{text}</p>
    </div>
  );
}
