import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VerticalBarsNoise } from './VerticalBarsNoise';
import { Button } from './ui/button';
import { Moon, Sun, Sparkles, Bookmark, Mail, LogOut, Wallet } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useWalletStatus } from '../hooks/useWalletStatus';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { isAuthenticated, userEmail, login, logout } = useAuth();
  const { hasWallet, evmAddress, isLoading: walletLoading } = useWalletStatus();

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
                {/* User Profile & Wallet Info - Glassmorphic Design */}
                <div 
                  className="group relative flex items-center h-9 pl-2 pr-3 rounded-full transition-all duration-300 cursor-default min-w-[140px] sm:min-w-[200px]"
                  style={{
                    backgroundColor: 'var(--glass-bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg-primary)'
                    e.currentTarget.style.borderColor = 'var(--page-border-color)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg-secondary)'
                    e.currentTarget.style.borderColor = 'var(--glass-border)'
                  }}
                >
                  {/* Wallet Icon - Round, Gray when not connected, Green when connected */}
                  <div 
                    className={`flex items-center justify-center h-6 w-6 rounded-full mr-2 transition-all duration-300 shrink-0 ${
                      hasWallet && !walletLoading 
                        ? 'bg-green-500/20 text-green-500 dark:text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]' 
                        : 'bg-gray-500/20 text-gray-500 dark:text-gray-400 border border-gray-500/30'
                    }`} 
                    title={hasWallet ? 'Wallet Connected' : 'No Wallet'}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </div>

                  {/* Content Wrapper */}
                  <div className="flex-1 relative h-5 overflow-hidden min-w-0">
                    {/* Email (Default) */}
                    <div className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${hasWallet && !walletLoading ? 'group-hover:-translate-y-full' : ''}`}>
                      <span className="text-xs sm:text-sm font-medium truncate w-full" style={{ color: 'var(--page-text-primary)' }}>
                        {userEmail}
                      </span>
                    </div>

                    {/* Wallet Address (Hover) */}
                    {hasWallet && !walletLoading && (
                      <div className="absolute inset-0 flex items-center translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                        <span className="text-xs sm:text-sm font-mono truncate w-full" style={{ color: 'var(--page-text-secondary)' }}>
                          {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
                        </span>
                      </div>
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
