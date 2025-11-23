import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VerticalBarsNoise } from './VerticalBarsNoise';
import { Button } from './ui/button';
import { Moon, Sun, Sparkles, Bookmark, Mail, LogOut, Wallet, Plus, Copy, Check } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useWalletStatus } from '../hooks/useWalletStatus';
import { useToast } from './useToast';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { isAuthenticated, login, logout, userEmail } = useAuth();
  const { hasWallet, evmAddress, isLoading: walletLoading } = useWalletStatus();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (evmAddress) {
      navigator.clipboard.writeText(evmAddress);
      setCopied(true);
      showToast('Address copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
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
                {/* User Profile & Wallet Info - Clean Design */}
                <div 
                  className="group relative flex items-center h-9 pl-1 pr-3 rounded-full transition-all duration-300 cursor-default min-w-[140px] sm:min-w-[180px] gap-2"
                  style={{
                    backgroundColor: 'var(--glass-bg-secondary)',
                    backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    boxShadow: 'var(--glass-shadow)',
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
                  {/* Wallet Icon / Plus Action */}
                  <div 
                    className={`group/icon flex items-center justify-center h-7 w-7 rounded-full transition-all duration-300 shrink-0 cursor-pointer hover:scale-105 ${
                      hasWallet && !walletLoading 
                        ? 'bg-green-500/15 text-green-500 dark:text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]' 
                        : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`} 
                    title={hasWallet ? 'Wallet Connected' : 'No Wallet'}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover/icon:opacity-0 transition-opacity duration-200">
                       <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity duration-200">
                       <Plus className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    {hasWallet && !walletLoading ? (
                      <>
                        {/* Email (default) / Wallet Address (on hover) */}
                        <div className="relative flex-1 min-w-0">
                          {/* Email - Default State */}
                          <div className="flex items-center gap-1.5 group-hover:opacity-0 transition-opacity duration-200">
                            <span className="text-xs font-medium truncate" style={{ color: 'var(--page-text-primary)' }}>
                              {userEmail || 'No email'}
                            </span>
                          </div>
                          
                          {/* Wallet Address - Hover State */}
                          <div 
                            className="absolute inset-0 flex items-center gap-1.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={handleCopyAddress}
                            title="Click to Copy Address"
                          >
                            <span className="text-xs font-mono font-medium truncate" style={{ color: 'var(--page-text-primary)' }}>
                              {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
                            </span>
                            {copied ? (
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-50 shrink-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>
                        
                        {/* ETH Balance - Rounded/Square Badge with expand animation */}
                        <div className="relative shrink-0">
                          <div className="px-2 py-1 rounded-full sm:rounded-lg transition-all duration-300 overflow-hidden whitespace-nowrap"
                            style={{
                              backgroundColor: 'var(--glass-bg-secondary)',
                              width: 'fit-content',
                              maxWidth: '80px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.maxWidth = '120px'
                              e.currentTarget.style.paddingLeft = '0.625rem'
                              e.currentTarget.style.paddingRight = '0.625rem'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.maxWidth = '80px'
                              e.currentTarget.style.paddingLeft = '0.5rem'
                              e.currentTarget.style.paddingRight = '0.5rem'
                            }}
                          >
                            <span className="text-xs font-semibold" style={{ color: 'var(--page-text-secondary)' }}>
                              0.00 ETH
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                        Connecting...
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
    </div>
  );
};
