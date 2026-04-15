import { chainId, chainName, faucetUrl } from "@/lib/contracts";

export function TestnetBanner() {
  return (
    <section className="testnet-banner">
      <div>
        <strong>{chainName} testnet</strong>
        <span>Chain ID {chainId}. Use test funds only.</span>
      </div>
      <a href={faucetUrl} target="_blank" rel="noreferrer">
        Get test ETH
      </a>
    </section>
  );
}
