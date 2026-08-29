import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Search, BookOpen, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout = () => {
  const { pathname } = useLocation();
  const { userProfile } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Catalog', path: '/catalog' },
    { icon: BookOpen, label: 'Dashboard', path: '/dashboard' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16 flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary">Tranholmen Library</h1>
        {userProfile && (
          <span className="text-sm font-medium text-gray-600">
            Hi, {userProfile.first_name}
          </span>
        )}
      </header>
      
      <main className="flex-1 w-full max-w-lg mx-auto p-4 flex flex-col">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center py-3 px-4 ${
                pathname === path ? 'text-primary' : 'text-gray-500'
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
