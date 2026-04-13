import { NavLink, useLocation } from 'react-router-dom';
import { GraduationCap, Home, Radio, Clock, Settings } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/session', icon: Radio, label: 'Session', requiresSession: true },
  { to: '/history', icon: Clock, label: 'History' },
  
];

export function AppSidebar() {
  const location = useLocation();
  const sessionStatus = useSessionStore((s) => s.sessionStatus);
  const isSessionActive = sessionStatus === 'active';

  return (
    <div className="flex flex-col w-16 bg-sidebar border-r border-sidebar-border items-center py-4 gap-1">
      <div className="mb-4 w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
        <GraduationCap size={19} className="text-primary-foreground" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label, requiresSession }) => {
          const disabled = requiresSession && !isSessionActive;
          const isActive = location.pathname === to;

          return (
            <NavLink
              key={to}
              to={disabled ? '#' : to}
              onClick={(e) => disabled && e.preventDefault()}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 group relative',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : disabled
                  ? 'text-sidebar-foreground/30 cursor-not-allowed'
                  : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
              )}
              title={label}
            >
              <Icon size={20} />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/settings"
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150',
          location.pathname === '/settings'
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
        )}
        title="Settings"
      >
        <Settings size={20} />
      </NavLink>
    </div>
  );
}
