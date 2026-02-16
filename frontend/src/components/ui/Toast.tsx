import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type Toast as ToastType } from '../../hooks/useToast';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS = {
  success: 'text-[#10b981] border-[#10b981]/30 bg-[#10b981]/10',
  error: 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10',
  warning: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10',
  info: 'text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/10',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismissToast } = useToast();
  const Icon = TOAST_ICONS[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-2xl backdrop-blur-xl border-2
        shadow-2xl min-w-[360px] max-w-[480px]
        animate-in slide-in-from-top duration-300
        ${TOAST_COLORS[toast.type]}
      `}
    >
      <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" strokeWidth={2.5} />

      <p className="flex-1 text-[15px] font-medium text-white/95 leading-relaxed">
        {toast.message}
      </p>

      <button
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors duration-200"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-white/70 hover:text-white/90" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 pointer-events-none">
      {toasts.slice(-3).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
