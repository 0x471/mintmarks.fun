// React import not needed in modern React with JSX transform
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { NETWORKS, type SupportedNetwork } from '../config/chains';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

export function NetworkSelector() {
  const { selectedNetwork, setNetwork } = useNetwork();
  const currentNetwork = NETWORKS[selectedNetwork];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-full border border-transparent bg-[var(--glass-bg-secondary)] px-3",
            "hover:bg-[var(--glass-bg-primary)] hover:border-[var(--nav-border)]",
            "transition-all duration-300"
          )}
        >
          <Globe className="h-4 w-4 text-[var(--page-text-secondary)]" />
          <span className="hidden sm:inline text-xs font-medium text-[var(--page-text-primary)]">
            {currentNetwork.name}
          </span>
          <ChevronDown className="h-3 w-3 text-[var(--page-text-muted)] opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {Object.values(NETWORKS).map((network) => (
          <DropdownMenuItem
            key={network.cdpNetwork}
            onClick={() => setNetwork(network.cdpNetwork as SupportedNetwork)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{network.name}</span>
              <span className="text-xs text-muted-foreground">
                {network.isTestnet ? 'Testnet' : 'Mainnet'}
              </span>
            </span>
            {selectedNetwork === network.cdpNetwork && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

