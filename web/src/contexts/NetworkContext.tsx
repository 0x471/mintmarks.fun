import React, { createContext, useContext, useState } from 'react';
import { NETWORKS, type SupportedNetwork } from '../config/chains';

interface NetworkContextType {
  selectedNetwork: SupportedNetwork;
  setNetwork: (network: SupportedNetwork) => void;
  isTestnet: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or default to celo-sepolia
  const [selectedNetwork, setSelectedNetworkState] = useState<SupportedNetwork>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedNetwork');
      if (saved && Object.keys(NETWORKS).includes(saved)) {
        return saved as SupportedNetwork;
      }
    }
    return 'celo-sepolia';
  });

  const setNetwork = (network: SupportedNetwork) => {
    setSelectedNetworkState(network);
    localStorage.setItem('selectedNetwork', network);
  };

  const value = {
    selectedNetwork,
    setNetwork,
    isTestnet: NETWORKS[selectedNetwork].isTestnet
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

