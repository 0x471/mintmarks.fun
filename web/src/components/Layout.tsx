import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VerticalBarsNoise } from './VerticalBarsNoise';
import { Button } from './ui/button';
import { Moon, Sun, Sparkles, Bookmark, Mail } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

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

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Email</span>
            </Button>
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
