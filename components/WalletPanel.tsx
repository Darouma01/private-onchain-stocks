"use client";

import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { appChain, chainId, shortAddress } from "@/lib/contracts";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { getUtilityText } from "@/lib/utilities/getUtilityText";

export function WalletPanel() {
  const { address, chainId: connectedChainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { selectedAsset } = useSelectedAsset();
  const text = getUtilityText(selectedAsset);
  const connector = connectors[0];
  const wrongNetwork = isConnected && connectedChainId !== chainId;
  const status = useMemo(() => {
    if (!isConnected) return `${text.connectPrompt}. Check KYC and manage ${selectedAsset.symbol}.`;
    if (wrongNetwork) return "Wrong network. Switch to Arbitrum Sepolia to continue.";
    return "Wallet connected on Arbitrum Sepolia.";
  }, [isConnected, selectedAsset.symbol, text.connectPrompt, wrongNetwork]);

  return (
    <section className="section status-section">
      <div>
        <h2>Wallet</h2>
        <p className="muted">{status}</p>
      </div>

      {isConnected ? (
        <div className="stack">
          <div className="identity-row">
            <span>Connected wallet</span>
            <strong>{shortAddress(address)}</strong>
          </div>
          {wrongNetwork ? (
            <button disabled={switching} onClick={() => switchChain({ chainId: appChain.id })}>
              {switching ? "Switching..." : "Switch to Arbitrum Sepolia"}
            </button>
          ) : null}
          <button className="secondary" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      ) : (
        <button disabled={isPending || !connector} onClick={() => connector && connect({ connector })}>
          {isPending ? "Opening wallet..." : "Connect Wallet"}
        </button>
      )}

      {error ? <p className="error">{error.message}</p> : null}
    </section>
  );
}
