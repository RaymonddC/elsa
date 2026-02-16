import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="group/user flex items-center gap-2.5 px-2 py-1.5">
      <img
        src={user.picture}
        alt={user.name}
        width={22}
        height={22}
        className="w-[22px] h-[22px] rounded-full flex-shrink-0 object-cover opacity-50"
        referrerPolicy="no-referrer"
      />
      <span className="text-[13px] text-white/30 truncate flex-1">{user.name}</span>
      <span
        onClick={logout}
        className="text-white/15 hover:text-white/40 cursor-pointer transition-all duration-200 opacity-0 group-hover/user:opacity-100"
      >
        <LogOut className="w-3 h-3" strokeWidth={1.5} />
      </span>
    </div>
  );
}
