import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="group/user flex items-center" style={{ padding: '4px 2px', gap: '10px' }}>
      <img
        src={user.picture}
        alt={user.name}
        className="rounded-full flex-shrink-0 object-cover opacity-50"
        style={{ width: '20px', height: '20px' }}
        referrerPolicy="no-referrer"
      />
      <span className="text-white/30 truncate flex-1" style={{ fontSize: '11px' }}>{user.name}</span>
      <span
        onClick={logout}
        className="text-white/15 hover:text-white/40 cursor-pointer transition-all duration-200 opacity-0 group-hover/user:opacity-100"
      >
        <LogOut style={{ width: '12px', height: '12px' }} strokeWidth={1.5} />
      </span>
    </div>
  );
}
