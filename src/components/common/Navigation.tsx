import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, BarChart3, Layers, Droplets, ArrowRightLeft, Users } from 'lucide-react';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    description: 'Main hub for staking and farming'
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'OrderBurn metrics & pool analytics'
  },
  {
    href: '/?tab=stake',
    label: 'Staking',
    icon: <Layers className="w-5 h-5" />,
    description: 'Stake tokens and earn rewards'
  },
  {
    href: '/?tab=liquidity',
    label: 'Liquidity',
    icon: <Droplets className="w-5 h-5" />,
    description: 'Provide liquidity and earn fees'
  },
  {
    href: '/?tab=swap',
    label: 'Swap',
    icon: <ArrowRightLeft className="w-5 h-5" />,
    description: 'Exchange tokens efficiently'
  },
];

export const Navigation: React.FC = () => {
  const router = useRouter();
  
  const isActive = (href: string) => {
    if (href === '/analytics') {
      return router.pathname === '/analytics';
    }
    if (href === '/') {
      return router.pathname === '/' && !router.query.tab;
    }
    if (href.includes('?tab=')) {
      const tab = href.split('?tab=')[1];
      return router.pathname === '/' && router.query.tab === tab;
    }
    return router.pathname === href;
  };

  return (
    <nav className="bg-gradient-surface border-b border-border-primary sticky top-0 z-40 backdrop-blur-glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/order-logo.jpg" alt="ORDER" className="w-8 h-8 rounded-full" />
            <span className="text-xl font-bold bg-gradient-accent bg-clip-text text-transparent">
              OrderStake
            </span>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group relative ${
                  isActive(item.href)
                    ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-surface-elevated border border-border-primary rounded-lg text-sm text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.description}
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 text-text-secondary hover:text-text-primary">
              <Users className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border-primary">
          <div className="grid grid-cols-2 gap-1 p-2">
            {navigationItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};