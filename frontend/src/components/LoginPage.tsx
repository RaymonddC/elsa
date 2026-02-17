import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Scan, TrendingUp, Eye } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="h-screen w-screen bg-[#090909] flex items-center justify-center animate-[fadeIn_0.6s_ease-out]">
      <div className="flex flex-col items-center">
        {/* Logo + Title */}
        <div className="flex items-center justify-center animate-[slideDown_0.5s_ease-out]" style={{ gap: '10px', marginBottom: '6px' }}>
          <img src="/elsa-logo.PNG" alt="" style={{ width: '36px', height: '36px' }} className="object-contain" />
          <h1 className="text-white/90 tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '26px', fontWeight: 600 }}>
            ELSA
          </h1>
        </div>
        <p className="text-white/25 animate-[fadeIn_0.7s_ease-out]" style={{ fontSize: '12px', marginBottom: '2px' }}>Crypto Wallet Analyzer</p>
        <p className="text-white/15 animate-[fadeIn_0.8s_ease-out]" style={{ fontSize: '10px', marginBottom: '28px' }}>Analyze ETH & BTC wallets. Spot patterns. Detect anomalies.</p>

        {/* Feature cards */}
        <div className="flex justify-center animate-[slideUp_0.7s_ease-out]" style={{ gap: '14px', marginBottom: '28px' }}>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm" style={{ width: '110px', padding: '14px 10px 12px', gap: '4px' }}>
            <Scan className="text-[#10b981]" style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
            <p className="text-white/50 font-medium" style={{ fontSize: '10px' }}>Deep Analysis</p>
            <p className="text-white/20 leading-relaxed" style={{ fontSize: '8px' }}>Transaction history & patterns</p>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm" style={{ width: '110px', padding: '14px 10px 12px', gap: '4px' }}>
            <TrendingUp className="text-[#14b8a6]" style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
            <p className="text-white/50 font-medium" style={{ fontSize: '10px' }}>Visual Charts</p>
            <p className="text-white/20 leading-relaxed" style={{ fontSize: '8px' }}>Interactive data visualization</p>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm" style={{ width: '110px', padding: '14px 10px 12px', gap: '4px' }}>
            <Eye className="text-[#0ea5e9]" style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
            <p className="text-white/50 font-medium" style={{ fontSize: '10px' }}>Anomaly Detection</p>
            <p className="text-white/20 leading-relaxed" style={{ fontSize: '8px' }}>Flag suspicious activity</p>
          </div>
        </div>

        {/* Sign in */}
        <div className="flex justify-center animate-[slideUp_0.9s_ease-out]">
          <GoogleLogin
            onSuccess={async (response) => {
              try {
                if (response.credential) {
                  await login(response.credential);
                }
              } catch {
                alert('Sign in failed. Please try again.');
              }
            }}
            onError={() => alert('Google Sign In failed')}
            theme="filled_black"
            size="large"
            text="signin_with"
            shape="pill"
            width="250"
          />
        </div>
      </div>
    </div>
  );
}
