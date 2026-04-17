"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ToastProvider } from "@/components/ToastSystem";
import { PricesProvider } from "@/lib/prices/usePrices";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { appChain } from "@/lib/contracts";

const wagmiConfig = createConfig({
  chains: [appChain],
  connectors: [injected()],
  transports: {
    [appChain.id]: http(),
  },
  ssr: true,
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PricesProvider>{children}</PricesProvider>
          <OnboardingModal />
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
