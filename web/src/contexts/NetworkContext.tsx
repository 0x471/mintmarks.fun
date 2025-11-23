import React, { createContext, useContext, useState, useCallback } from 'react';
import { NETWORKS, type SupportedNetwork } from '../config/chains';

interface NetworkContextType {
  selectedNetwork: SupportedNetwork;
  setNetwork: (network: SupportedNetwork) => Promise<void>;
  isTestnet: boolean;
  isSwitching: boolean;
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
    return 'celo'; // Default to Celo Mainnet for production
  });
  
  const [isSwitching, setIsSwitching] = useState(false);

  const setNetwork = useCallback(async (network: SupportedNetwork) => {
    setIsSwitching(true);
    try {
      const networkConfig = NETWORKS[network];
      
      // Try to switch chain in the wallet provider if available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${networkConfig.id.toString(16)}` }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: `0x${networkConfig.id.toString(16)}`,
                    chainName: networkConfig.name,
                    nativeCurrency: {
                      name: networkConfig.nativeCurrency.name,
                      symbol: networkConfig.nativeCurrency.symbol,
                      decimals: networkConfig.nativeCurrency.decimals,
                    },
                    rpcUrls: [networkConfig.rpcUrl],
                    blockExplorerUrls: [networkConfig.explorer],
                  },
                ],
              });
            } catch (addError) {
              console.error('Failed to add chain:', addError);
              // Don't block UI update if wallet interaction fails (e.g. user rejected or using embedded wallet)
            }
          } else {
            console.error('Failed to switch chain:', switchError);
            // Don't block UI update if wallet interaction fails
          }
        }
      }

      // Update local state
      setSelectedNetworkState(network);
      localStorage.setItem('selectedNetwork', network);
    } finally {
      setIsSwitching(false);
    }
  }, []);

  const value = {
    selectedNetwork,
    setNetwork,
    isTestnet: NETWORKS[selectedNetwork].isTestnet,
    isSwitching
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

