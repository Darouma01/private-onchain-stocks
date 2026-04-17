"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const steps = [
  { label: "Connect your wallet", detail: "Use the wallet button in the header or wallet card." },
  { label: "Get test ETH from faucet", detail: "Fund your Arbitrum Sepolia wallet.", href: "https://cdefi.iex.ec/" },
  { label: "Complete KYC for stock assets", detail: "KYC unlocks compliant stock wrapping and transfers." },
  { label: "Wrap your first token", detail: "Move a standard asset into its confidential wrapper." },
  { label: "Explore private DeFi", detail: "Try dividends, governance, collateral, and AI tools." },
];

export function OnboardingModal() {
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (window.localStorage.getItem("private-stocks:onboarding-dismissed") !== "true") {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected) setCompleted((current) => Array.from(new Set([...current, steps[0].label])));
  }, [isConnected]);

  function toggle(label: string) {
    setCompleted((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  }

  function dismiss() {
    window.localStorage.setItem("private-stocks:onboarding-dismissed", "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="First-time onboarding">
      <section className="onboarding-modal">
        <div className="drawer-header">
          <div>
            <span className="hero-eyebrow">First-time setup</span>
            <h2>Start trading privately</h2>
          </div>
          <button className="ghost-button close-button" onClick={dismiss} type="button">Close</button>
        </div>
        <div className="onboarding-progress" aria-label={`${completed.length} of ${steps.length} steps complete`}>
          <span style={{ width: `${(completed.length / steps.length) * 100}%` }} />
        </div>
        <div className="onboarding-steps">
          {steps.map((step) => {
            const done = completed.includes(step.label);
            return (
              <button className={done ? "done" : undefined} key={step.label} onClick={() => toggle(step.label)} type="button">
                <span>{done ? "✓" : "○"}</span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
                {step.href ? <a href={step.href} rel="noreferrer" target="_blank">Open faucet</a> : null}
              </button>
            );
          })}
        </div>
        <button disabled={completed.length < steps.length} onClick={dismiss} type="button">
          {completed.length < steps.length ? "Complete setup steps" : "Finish onboarding"}
        </button>
      </section>
    </div>
  );
}
