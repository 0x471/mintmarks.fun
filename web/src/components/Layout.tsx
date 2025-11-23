import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VerticalBarsNoise } from './VerticalBarsNoise';
import { Button } from './ui/button';
import { Moon, Sun, Sparkles, Bookmark, Mail, LogOut, Wallet, Copy, Check } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useWalletStatus } from '../hooks/useWalletStatus';
import { useNetwork } from '../contexts/NetworkContext';
import { NetworkSelector } from './NetworkSelector';
import { useToast } from './useToast';
import { WalletOperationsModal } from './WalletOperationsModal';
import { NETWORKS } from '@/config/chains';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { isAuthenticated, login, logout, userEmail } = useAuth();
  const { selectedNetwork, setNetwork } = useNetwork();
  const { hasWallet, evmAddress, isLoading: walletLoading, balance: celoBalance, isLoadingBalance } = useWalletStatus();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  const currentNetwork = NETWORKS[selectedNetwork];

  const handleCopyAddress = () => {
    if (evmAddress) {
      navigator.clipboard.writeText(evmAddress);
      setCopied(true);
      showToast('Address copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format Balance based on network symbol
  const formatBalance = (balance: number): string => {
    const symbol = currentNetwork.nativeCurrency.symbol;
    if (balance === 0) return `0.00 ${symbol}`;
    if (balance < 0.005) {
      return `${balance.toFixed(5)} ${symbol}`;
    }
    return `${balance.toFixed(3)} ${symbol}`;
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Background Animation */}
      <VerticalBarsNoise />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--nav-border)] bg-[var(--nav-bg)] backdrop-blur-[var(--glass-blur)]">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">mintmarks.fun</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button
              asChild
              variant={location.pathname === '/create' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Link to="/create">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Create Mark</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant={location.pathname === '/marks' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Link to="/marks">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">My Marks</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700" />
              )}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Network Selector */}
                <NetworkSelector />

                {/* User Profile & Wallet Info Container */}
                <div 
                  className="group relative flex items-center h-9 pl-1 pr-2 sm:pr-3 rounded-full transition-all duration-300 min-w-[120px] sm:min-w-[140px] md:min-w-[180px] gap-1.5 sm:gap-2 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--glass-bg-secondary)',
                    backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                  onClick={() => {
                    if (hasWallet && !walletLoading) {
                      setIsWalletModalOpen(true)
                    } else if (!hasWallet && !walletLoading && isAuthenticated) {
                      // Show wallet creation options
                      setIsWalletModalOpen(true)
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg-primary)'
                    e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg-secondary)'
                    e.currentTarget.style.boxShadow = 'var(--glass-shadow)'
                  }}
                >
                  {/* Wallet Icon with Balance */}
                  <div 
                    className={`relative flex items-center gap-1.5 h-7 rounded-full shrink-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${
                      hasWallet && !walletLoading 
                        ? 'bg-green-500/15 text-green-500 dark:text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]' 
                        : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`}
                    style={{
                      minWidth: '28px',
                      paddingLeft: hasWallet && !walletLoading ? '0.5rem' : '0',
                      paddingRight: hasWallet && !walletLoading ? '0.5rem' : '0',
                    }}
                    title={hasWallet ? 'Wallet Connected' : 'No Wallet'}
                  >
                    {/* Wallet Icon */}
                    <div className="flex items-center justify-center w-7 h-7 shrink-0">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    
                    {/* CELO Balance - Always visible */}
                    {hasWallet && !walletLoading && (
                      <span className="text-xs font-semibold whitespace-nowrap pr-1" style={{ color: 'var(--page-text-secondary)' }}>
                        {isLoadingBalance ? '...' : formatBalance(celoBalance)}
                      </span>
                    )}
                  </div>

                  {/* Email / Wallet Address Display */}
                  <div className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
                    {hasWallet && !walletLoading ? (
                      <>
                        {/* Email (default) - Wallet Address (hover) */}
                        <div className="relative flex-1 min-w-0">
                          {/* Email - Shown by default (without @domain) */}
                          <div className="text-xs font-medium truncate transition-opacity duration-200 group-hover:opacity-0"
                            style={{ color: 'var(--page-text-primary)' }}
                          >
                            {userEmail?.split('@')[0] || 'No email'}
                          </div>
                          
                          {/* Wallet Address - Shown on hover */}
                          <div 
                            className="absolute inset-0 flex items-center gap-1 sm:gap-1.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={handleCopyAddress}
                            title="Click to copy wallet address"
                          >
                            <span className="text-xs font-mono font-medium truncate" style={{ color: 'var(--page-text-primary)' }}>
                              <span className="hidden sm:inline">{evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}</span>
                              <span className="sm:hidden">{evmAddress?.slice(0, 4)}...{evmAddress?.slice(-3)}</span>
                            </span>
                            {copied ? (
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-70 shrink-0" />
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--page-text-secondary)' }}>
                        {walletLoading ? 'Connecting...' : 'Sign in Wallet'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Disconnect Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 rounded-full shrink-0 transition-all duration-200"
                  style={{
                    color: 'var(--page-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--destructive)'
                    e.currentTarget.style.backgroundColor = 'var(--destructive)/10'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--page-text-muted)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title="Disconnect"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={login}
                className="gap-2 rounded-full"
                title="Connect with Gmail"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Connect Email</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full">
        {children}
      </main>

      {/* Wallet Operations Modal */}
      {isAuthenticated && (
        <WalletOperationsModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          evmAddress={evmAddress}
          balance={celoBalance}
          selectedNetwork={selectedNetwork}
          onNetworkChange={setNetwork}
          needsWalletCreation={!hasWallet}
        />
      )}
    </div>
  );
};
