import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50">
      <header className="border-b border-brand-100/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="font-heading text-xl font-bold text-brand-900">
            Real-Time Collaboration
          </Link>
          <nav className="flex items-center gap-3">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive ? 'bg-brand-600 text-white' : 'text-brand-700 hover:bg-brand-100'
                }`
              }
            >
              Dashboard
            </NavLink>
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-900">{user?.name}</p>
              <p className="text-xs text-brand-700">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
};
