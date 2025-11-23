// React import not needed in modern React with JSX transform
import { ChevronDown } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { NETWORKS, type SupportedNetwork } from '../config/chains';
import { cn } from '../lib/utils';

interface NetworkSelectorProps {
  variant?: 'header' | 'modal' | 'compact'
  className?: string
  onNetworkChange?: (network: SupportedNetwork) => void
  selectedNetwork?: SupportedNetwork
  showBalance?: boolean
  evmAddress?: string
}

export function NetworkSelector({ 
  variant = 'header', 
  className,
  onNetworkChange,
  selectedNetwork: propSelectedNetwork,
  showBalance = false,
  evmAddress
}: NetworkSelectorProps = {}) {
  const { selectedNetwork: contextNetwork, setNetwork: contextSetNetwork } = useNetwork();
  
  // Support both controlled (via props) and uncontrolled (via context) mode
  const selectedNetwork = propSelectedNetwork || contextNetwork;
  const handleNetworkChange = onNetworkChange || contextSetNetwork;
  const currentNetwork = NETWORKS[selectedNetwork];

  // All variants now use native select for reliability

  // Temporary: Use native select for reliability
  if (variant === 'modal') {
    return (
      <div className="w-full">
        <select 
          value={selectedNetwork}
          onChange={(e) => handleNetworkChange(e.target.value as SupportedNetwork)}
          className={cn(
            "w-full h-10 rounded-xl px-4 border bg-transparent text-sm font-medium",
            "bg-[var(--glass-bg-tertiary)] border-[var(--glass-border)]",
            "text-[var(--page-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500",
            className
          )}
          style={{
            backgroundColor: 'var(--glass-bg-tertiary)',
            borderColor: 'var(--glass-border)',
            color: 'var(--page-text-primary)'
          }}
        >
          {Object.values(NETWORKS).map((network) => (
            <option 
              key={network.cdpNetwork} 
              value={network.cdpNetwork}
              style={{
                backgroundColor: 'var(--glass-bg-primary)',
                color: 'var(--page-text-primary)'
              }}
            >
              {network.name} - {network.nativeCurrency.symbol} • {network.id} {network.isTestnet ? '(TEST)' : '(MAIN)'}
            </option>
          ))}
        </select>
        {showBalance && evmAddress && (
          <div className="mt-2 text-xs text-[var(--page-text-muted)]">
            Balance will be shown here when implemented
          </div>
        )}
      </div>
    )
  }

  // For header, use native select like modal
  return (
    <div className="relative">
      <select 
        value={selectedNetwork}
        onChange={(e) => handleNetworkChange(e.target.value as SupportedNetwork)}
        className={cn(
          "h-9 rounded-full px-3 border-0 bg-transparent text-xs font-medium appearance-none cursor-pointer",
          "bg-[var(--glass-bg-secondary)] text-[var(--page-text-primary)]",
          "hover:bg-[var(--glass-bg-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500",
          "pr-8", // Space for chevron icon
          className
        )}
        style={{
          backgroundColor: 'var(--glass-bg-secondary)',
          color: 'var(--page-text-primary)'
        }}
      >
        {Object.values(NETWORKS).map((network) => (
          <option 
            key={network.cdpNetwork} 
            value={network.cdpNetwork}
            style={{
              backgroundColor: 'var(--glass-bg-primary)',
              color: 'var(--page-text-primary)'
            }}
          >
            {network.name}
          </option>
        ))}
      </select>
      
      {/* Custom chevron icon */}
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--page-text-muted)] opacity-50 pointer-events-none" />
    </div>
  );
}

