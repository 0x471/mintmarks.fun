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
                {/* User Profile & Wallet Info */}
                <div className="group relative flex items-center h-9 pl-1.5 pr-3 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 cursor-default min-w-[140px] sm:min-w-[180px]">
                  
                  {/* Wallet Icon Box */}
                  <div className={`flex items-center justify-center h-6 w-6 rounded-full mr-2 transition-colors duration-300 shrink-0 ${
                      hasWallet && !walletLoading 
                          ? 'bg-green-500/10 text-green-600 border border-green-500/20 shadow-[0_0_6px_rgba(34,197,94,0.2)]' 
                          : 'bg-muted text-muted-foreground border border-border'
                  }`} title={hasWallet ? 'Wallet Connected' : 'No Wallet'}>
                    <Wallet className="h-3 w-3" />
                  </div>

                  {/* Content Wrapper */}
                  <div className="flex-1 relative h-5 overflow-hidden">
                      {/* Email (Default) */}
                      <div className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${hasWallet && !walletLoading ? 'group-hover:-translate-y-full' : ''}`}>
                          <span className="text-xs sm:text-sm font-medium truncate w-full">
                              {userEmail}
                          </span>
                      </div>

                      {/* Wallet Address (Hover) */}
                      {hasWallet && !walletLoading && (
                          <div className="absolute inset-0 flex items-center translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                              <span className="text-xs sm:text-sm font-mono text-muted-foreground truncate w-full">
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
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
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
