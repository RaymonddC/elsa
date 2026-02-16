interface LoadingSkeletonProps {
  lines?: number;
  widths?: string[];
  className?: string;
}

export default function LoadingSkeleton({ lines = 3, widths = ['80%', '60%', '90%'], className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="relative h-5 bg-white/5 rounded-lg overflow-hidden"
          style={{ width: widths[i % widths.length] }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`rounded-xl bg-white/[0.03] border border-white/[0.04] p-6 animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-4 bg-white/10 rounded-lg w-1/3" />
        <div className="h-8 bg-white/10 rounded-lg w-2/3" />
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          <div className="h-16 bg-white/10 rounded-lg" />
          <div className="h-16 bg-white/10 rounded-lg" />
          <div className="h-16 bg-white/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
