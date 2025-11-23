import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VerticalBarsNoise } from './VerticalBarsNoise';
import { Button } from './ui/button';
import { Moon, Sun, Sparkles, Bookmark, Mail, LogOut } from 'lucide-react';
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
              <div className="flex items-center gap-2 pl-2">
                {/* User Profile & Wallet */}
                <div className="group relative flex items-center gap-2 px-2 py-1.5 rounded-full bg-[var(--muted)]/50 border border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-default min-w-[140px] sm:min-w-[180px]">
                  
                  {/* Avatar */}
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {userEmail ? userEmail[0].toUpperCase() : 'U'}
                  </div>

                  {/* Content Wrapper */}
                  <div className="flex-1 relative h-4 overflow-hidden">
                      {/* Email (Default) */}
                      <div className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${hasWallet && !walletLoading ? 'group-hover:-translate-y-full' : ''}`}>
                          <span className="text-xs font-medium truncate w-full block max-w-[100px] sm:max-w-[140px]">
                              {userEmail}
                          </span>
                      </div>

                      {/* Wallet Address (Hover) */}
                      {hasWallet && !walletLoading && (
                          <div className="absolute inset-0 flex items-center translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                              <span className="text-xs font-mono text-[var(--foreground)]/80 truncate w-full block">
                                  {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
                              </span>
                          </div>
                      )}
                  </div>

                  {/* Wallet Indicator */}
                  <div className={`h-2 w-2 rounded-[2px] shrink-0 transition-colors ${
                      hasWallet && !walletLoading 
                          ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' 
                          : 'bg-slate-400 dark:bg-slate-600'
                  }`} title={hasWallet ? 'Wallet Connected' : 'No Wallet'} />

                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
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
