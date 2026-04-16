"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
import {
  assetDeployment,
  categoryLabels,
  deployedAssetCategories,
  deployedAssets,
  moduleAddresses,
  type DeployedAsset,
} from "@/lib/deployed-assets";
import {
  addressUrl,
  baseAssetAbi,
  confidentialWrapperAbi,
  deployedNoxExecutorAddress,
  shortAddress,
  txUrl,
} from "@/lib/contracts";

type Tab = "Markets" | "Portfolio" | "Trade" | "Dividends" | "Governance" | "Collateral" | "AI Tools";

type ActionState = {
  label: string;
  hash?: `0x${string}`;
  error?: string;
};

const tabs: Tab[] = ["Markets", "Portfolio", "Trade", "Dividends", "Governance", "Collateral", "AI Tools"];

export function MultiAssetProtocolDashboard() {
  const [tab, setTab] = useState<Tab>("Markets");
  const [category, setCategory] = useState<AssetCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("cAAPL");

  const selectedAsset = deployedAssets.find((asset) => asset.symbol === selectedSymbol) ?? deployedAssets[0];
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return deployedAssets.filter((asset) => {
      const matchesCategory = category === "ALL" || asset.category === category;
      const matchesQuery =
        normalized.length === 0 ||
        asset.symbol.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized) ||
        asset.country?.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const categoryCounts = useMemo(() => {
    return deployedAssetCategories.map((item) => ({
      category: item,
      count: deployedAssets.filter((asset) => asset.category === item).length,
    }));
  }, []);

  return (
    <section className="section multi-asset-section">
      <div className="row">
        <div>
          <h2>61 Deployed Confidential Assets</h2>
          <p className="muted">
            Every listed market has a base ERC-3643-style asset and an ERC-7984-style confidential wrapper on Arbitrum
            Sepolia.
          </p>
        </div>
        <span className="status-dot good">{assetDeployment.selectedSymbols.length} live assets</span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span className="muted">Asset Registry</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.AssetRegistry)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Wrapper Factory</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.ConfidentialWrapperFactory)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Nox Adapter</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.NoxExecutor)}</strong>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Protocol sections">
        {tabs.map((item) => (
          <button
            className={item === tab ? "tab active" : "tab"}
            key={item}
            onClick={() => setTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Markets" ? (
        <MarketsTab
          category={category}
          categoryCounts={categoryCounts}
          filteredAssets={filteredAssets}
          query={query}
          selectedSymbol={selectedSymbol}
          setCategory={setCategory}
          setQuery={setQuery}
          setSelectedSymbol={setSelectedSymbol}
          selectedAsset={selectedAsset}
        />
      ) : null}
      {tab === "Portfolio" ? <PortfolioTab selectedAsset={selectedAsset} /> : null}
      {tab === "Trade" ? <TradeTab selectedAsset={selectedAsset} setSelectedSymbol={setSelectedSymbol} /> : null}
      {tab === "Dividends" ? <DividendsTab selectedAsset={selectedAsset} /> : null}
      {tab === "Governance" ? <GovernanceTab selectedAsset={selectedAsset} /> : null}
      {tab === "Collateral" ? <CollateralTab selectedAsset={selectedAsset} /> : null}
      {tab === "AI Tools" ? <AiToolsTab selectedAsset={selectedAsset} /> : null}
    </section>
  );
}

function MarketsTab({
  category,
  categoryCounts,
  filteredAssets,
  query,
  selectedSymbol,
  selectedAsset,
  setCategory,
  setQuery,
  setSelectedSymbol,
}: {
  category: AssetCategory | "ALL";
  categoryCounts: Array<{ category: AssetCategory; count: number }>;
  filteredAssets: DeployedAsset[];
  query: string;
  selectedSymbol: string;
  selectedAsset: DeployedAsset;
  setCategory: (category: AssetCategory | "ALL") => void;
  setQuery: (query: string) => void;
  setSelectedSymbol: (symbol: string) => void;
}) {
  return (
    <div className="stack">
      <div className="market-controls">
        <input
          aria-label="Search deployed assets"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search symbol, name, or country"
          value={query}
        />
        <select
          aria-label="Filter asset category"
          onChange={(event) => setCategory(event.target.value as AssetCategory | "ALL")}
          value={category}
        >
          <option value="ALL">All categories</option>
          {deployedAssetCategories.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item]}
            </option>
          ))}
        </select>
      </div>

      <div className="category-strip">
        {categoryCounts.map((item) => (
          <button className="category-button" key={item.category} onClick={() => setCategory(item.category)} type="button">
            <strong>{item.count}</strong>
            <span>{categoryLabels[item.category]}</span>
          </button>
        ))}
      </div>

      <div className="asset-grid">
        {filteredAssets.map((asset) => (
          <AssetCard
            asset={asset}
            isSelected={selectedSymbol === asset.symbol}
            key={asset.symbol}
            onSelect={() => setSelectedSymbol(asset.symbol)}
          />
        ))}
      </div>

      <AssetActionPanel asset={selectedAsset} />
    </div>
  );
}

function AssetCard({ asset, isSelected, onSelect }: { asset: DeployedAsset; isSelected: boolean; onSelect: () => void }) {
  return (
    <article className={isSelected ? "asset-card selected" : "asset-card"}>
      <div className="row">
        <div>
          <strong>{asset.symbol}</strong>
          <p className="muted">{asset.name}</p>
        </div>
        <span className={asset.requiresKYC ? "status-dot neutral" : "status-dot good"}>
          {asset.requiresKYC ? "KYC" : "Open"}
        </span>
      </div>
      <div className="asset-meta">
        <span>{categoryLabels[asset.category]}</span>
        <span>{asset.country ?? "Global"}</span>
      </div>
      <div className="address-pair">
        <a href={addressUrl(asset.baseAddress)} rel="noreferrer" target="_blank">
          Base {shortAddress(asset.baseAddress)}
        </a>
        <a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">
          Wrapper {shortAddress(asset.wrapperAddress)}
        </a>
      </div>
      <button className="secondary" onClick={onSelect} type="button">
        Use {asset.symbol}
      </button>
    </article>
  );
}

function PortfolioTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="stack">
      <AssetActionPanel asset={selectedAsset} />
      <div className="utility-layout">
        <UtilityBlock
          title="Hidden Holdings"
          text="Portfolio rows use confidential wrapper contracts. Balances stay hidden as encrypted handles until the owner requests a Nox disclosure."
        />
        <UtilityBlock
          title="Private Tiering"
          text="Dashboard sections can call encrypted balance or portfolio threshold checks instead of reading public token balances."
        />
      </div>
    </div>
  );
}

function TradeTab({
  selectedAsset,
  setSelectedSymbol,
}: {
  selectedAsset: DeployedAsset;
  setSelectedSymbol: (symbol: string) => void;
}) {
  return (
    <div className="stack">
      <div className="action-panel">
        <div>
          <strong>Select active asset</strong>
          <p className="muted">Choose any deployed asset, then approve, wrap, and privately transfer it below.</p>
        </div>
        <select onChange={(event) => setSelectedSymbol(event.target.value)} value={selectedAsset.symbol}>
          {deployedAssets.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>
              {asset.symbol} - {asset.name}
            </option>
          ))}
        </select>
      </div>
      <AssetActionPanel asset={selectedAsset} />
      <div className="utility-layout">
        <SelectedAssetPanel asset={selectedAsset} label="From asset" />
        <div className="action-panel">
          <strong>Cross-asset confidential trade</strong>
          <p className="muted">
            Use encrypted amount handles for both legs. The wrapper emits asset/from/to metadata but never plaintext
            amounts.
          </p>
          <div className="metric-grid">
            <div className="metric">
              <span className="muted">Settlement asset</span>
              <strong>cUSDC</strong>
            </div>
            <div className="metric">
              <span className="muted">Trade privacy</span>
              <strong>Encrypted</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetActionPanel({ asset }: { asset: DeployedAsset }) {
  const { address, isConnected } = useAccount();
  const [wrapAmount, setWrapAmount] = useState("10");
  const [transferAmount, setTransferAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [action, setAction] = useState<ActionState | null>(null);
  const { writeContractAsync } = useWriteContract();

  const standardBalance = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const allowance = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "allowance",
    args: address ? [address, asset.wrapperAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const encryptedBalance = useReadContract({
    address: asset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const wait = useWaitForTransactionReceipt({
    hash: action?.hash,
    query: { enabled: Boolean(action?.hash) },
  });

  const wrapAmountWei = useMemo(() => safeParseEther(wrapAmount), [wrapAmount]);
  const transferAmountWei = useMemo(() => safeParseEther(transferAmount), [transferAmount]);
  const hasEncryptedBalance = Boolean(
    encryptedBalance.data &&
      encryptedBalance.data !== "0x0000000000000000000000000000000000000000000000000000000000000000",
  );

  async function refresh() {
    await Promise.all([standardBalance.refetch(), allowance.refetch(), encryptedBalance.refetch()]);
  }

  async function approve(event: FormEvent) {
    event.preventDefault();
    if (!wrapAmountWei) {
      setAction({ label: "Approval needs attention", error: "Enter an amount greater than zero." });
      return;
    }
    try {
      setAction({ label: `Approving ${asset.symbol} wrapper...` });
      const hash = await writeContractAsync({
        address: asset.baseAddress,
        abi: baseAssetAbi,
        functionName: "approve",
        args: [asset.wrapperAddress, wrapAmountWei],
      });
      setAction({ label: `${asset.symbol} approval submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Approval failed", error: errorMessage(caught) });
    }
  }

  async function wrap(event: FormEvent) {
    event.preventDefault();
    if (!wrapAmountWei) {
      setAction({ label: "Wrap needs attention", error: "Enter an amount greater than zero." });
      return;
    }
    try {
      if ((allowance.data ?? 0n) < wrapAmountWei) {
        setAction({ label: "Approval required", error: `Approve the ${asset.symbol} wrapper before wrapping this amount.` });
        return;
      }
      setAction({ label: `Wrapping ${asset.symbol} into its confidential wrapper...` });
      const hash = await writeContractAsync({
        address: asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "wrap",
        args: [wrapAmountWei, "0x"],
      });
      setAction({ label: `${asset.symbol} wrap submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Wrap failed", error: errorMessage(caught) });
    }
  }

  async function transfer(event: FormEvent) {
    event.preventDefault();
    if (!transferAmountWei || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setAction({ label: "Transfer needs attention", error: "Enter a valid recipient and amount greater than zero." });
      return;
    }
    try {
      setAction({ label: `Creating encrypted ${asset.symbol} transfer handle...` });
      const response = await fetch("/api/demo/create-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: transferAmountWei.toString(), noxAddress: deployedNoxExecutorAddress }),
      });
      const payload = (await response.json()) as { handle?: `0x${string}`; transactionHash?: `0x${string}`; error?: string };
      if (!response.ok || !payload.handle) {
        throw new Error(payload.error ?? "Unable to create encrypted amount handle");
      }

      setAction({ label: "Encrypted amount handle created", hash: payload.transactionHash });
      const hash = await writeContractAsync({
        address: asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "confidentialTransfer",
        args: [recipient as `0x${string}`, payload.handle, "0x"],
      });
      setAction({ label: `${asset.symbol} confidential transfer submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Confidential transfer failed", error: errorMessage(caught) });
    }
  }

  if (!isConnected) {
    return (
      <div className="action-panel">
        <strong>Connect wallet to use {asset.symbol}</strong>
        <p className="muted">After connecting, you can approve, wrap, and privately transfer this deployed asset.</p>
      </div>
    );
  }

  return (
    <div className="action-panel">
      <div className="row">
        <div>
          <strong>Use {asset.symbol}</strong>
          <p className="muted">
            Approve the base asset, wrap into {asset.wrapperAddress ? "the confidential wrapper" : "confidential form"},
            then transfer encrypted amounts.
          </p>
        </div>
        <span className={hasEncryptedBalance ? "status-dot good" : "status-dot neutral"}>
          {hasEncryptedBalance ? "Wrapped" : "Not wrapped"}
        </span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span className="muted">Base balance</span>
          <strong>{standardBalance.data === undefined ? "..." : `${formatEther(standardBalance.data)} ${asset.symbol}`}</strong>
        </div>
        <div className="metric">
          <span className="muted">Approved amount</span>
          <strong>{allowance.data === undefined ? "..." : formatEther(allowance.data)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Encrypted balance handle</span>
          <strong className="handle-text">
            {hasEncryptedBalance && encryptedBalance.data ? `${encryptedBalance.data.slice(0, 10)}...` : "None"}
          </strong>
        </div>
      </div>

      <form className="inline-action-grid" onSubmit={approve}>
        <input
          aria-label={`Amount of ${asset.symbol} to approve or wrap`}
          inputMode="decimal"
          onChange={(event) => setWrapAmount(event.target.value)}
          value={wrapAmount}
        />
        <button disabled={!wrapAmountWei} type="submit">
          Approve
        </button>
        <button disabled={!wrapAmountWei} onClick={(event) => void wrap(event)} type="button">
          Wrap
        </button>
      </form>

      <form className="transfer-grid" onSubmit={transfer}>
        <input
          aria-label="Confidential transfer recipient"
          onChange={(event) => setRecipient(event.target.value)}
          placeholder="Recipient wallet"
          value={recipient}
        />
        <input
          aria-label={`Encrypted ${asset.symbol} transfer amount`}
          inputMode="decimal"
          onChange={(event) => setTransferAmount(event.target.value)}
          value={transferAmount}
        />
        <button disabled={!transferAmountWei || !hasEncryptedBalance} type="submit">
          Transfer Privately
        </button>
      </form>

      <ActionFeedback action={action} pending={wait.isLoading} confirmed={wait.isSuccess} />
    </div>
  );
}

function ActionFeedback({ action, pending, confirmed }: { action: ActionState | null; pending: boolean; confirmed: boolean }) {
  if (!action) return null;
  return (
    <div className={`feedback ${action.error ? "bad" : confirmed ? "good" : "neutral"}`}>
      <strong>{pending ? "Waiting for confirmation..." : action.label}</strong>
      {action.error ? <p>{action.error}</p> : null}
      {action.hash ? (
        <a href={txUrl(action.hash)} target="_blank" rel="noreferrer">
          View transaction on Arbiscan
        </a>
      ) : null}
    </div>
  );
}

function DividendsTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  const enabled = selectedAsset.category !== AssetCategory.COMMODITY;
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Reward asset" />
      <UtilityBlock
        title={enabled ? "Confidential rewards enabled" : "Commodity rewards disabled"}
        text={
          enabled
            ? "Distributions update encrypted holder balances and emit holder/distribution metadata without public reward amounts."
            : "Commodity assets are excluded from dividend distributions by the confidential wrapper."
        }
      />
    </div>
  );
}

function GovernanceTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Voting asset" />
      <UtilityBlock
        title="Private voting"
        text="Proposal votes use encrypted vote and encrypted weight payloads. The interface shows participation without exposing voting power."
      />
      <UtilityBlock
        title="Protocol-wide proposals"
        text="Affected asset lists can include one asset or all 61 wrappers for protocol-wide governance decisions."
      />
    </div>
  );
}

function CollateralTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Collateral asset" />
      <UtilityBlock
        title="Confidential collateral proof"
        text="The Nox adapter returns a sufficiency proof for DeFi integrations without revealing the holder's exact balance."
      />
      <UtilityBlock
        title="Borrow assets"
        text="Preferred loan assets are cUSDC, cUSDT, cDAI, and cEURC. Collateral can mix any deployed confidential asset."
      />
    </div>
  );
}

function AiToolsTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="AI context asset" />
      <UtilityBlock
        title="Smart Contract Auditor"
        text="The auditor can inspect the deployed base token or confidential wrapper address for any selected asset."
      />
      <UtilityBlock
        title="On-chain Insights"
        text="Insights should stay aggregate-only: supply, holder count, modules, and transfer activity without individual confidential balances."
      />
    </div>
  );
}

function SelectedAssetPanel({ asset, label }: { asset: DeployedAsset; label: string }) {
  return (
    <div className="action-panel">
      <div>
        <span className="muted">{label}</span>
        <strong>
          {asset.symbol} · {asset.name}
        </strong>
      </div>
      <p className="muted">{asset.complianceNotes}</p>
      <div className="address-pair">
        <a href={addressUrl(asset.baseAddress)} rel="noreferrer" target="_blank">
          Base contract {shortAddress(asset.baseAddress)}
        </a>
        <a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">
          Confidential wrapper {shortAddress(asset.wrapperAddress)}
        </a>
      </div>
    </div>
  );
}

function UtilityBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="action-panel">
      <strong>{title}</strong>
      <p className="muted">{text}</p>
    </div>
  );
}

function safeParseEther(value: string) {
  try {
    const parsed = parseEther(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Transaction failed";
}
