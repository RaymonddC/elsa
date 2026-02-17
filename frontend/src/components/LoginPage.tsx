import { useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Scan, TrendingUp, Eye } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#10b981" />
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleCustomClick = () => {
    // Find and click the real Google button inside the hidden container
    const btn = googleBtnRef.current?.querySelector('[role="button"]') as HTMLElement;
    if (btn) btn.click();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(145deg, #080a0b 0%, #0a0f0d 40%, #090b0c 100%)', animation: 'fadeIn 0.6s ease-out' }}>
      {/* Background glows */}
      <div className="absolute" style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
      <div className="absolute" style={{ width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(14,165,233,0.03) 0%, transparent 60%)', top: '60%', left: '30%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

      <div className="flex flex-col items-center relative">
        {/* Logo + Title */}
        <div className="flex flex-col items-center" style={{ marginBottom: '10px', animation: 'scaleIn 0.5s ease-out' }}>
          <div className="relative" style={{ marginBottom: '2px' }}>
            <div className="absolute" style={{ inset: '-12px', background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 65%)', filter: 'blur(12px)' }} />
            <img src="/elsa-logo.PNG" alt="" style={{ width: '48px', height: '48px' }} className="object-contain relative" />
          </div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.06em', margin: 0 }}>
            ELSA
          </h1>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(16,185,129,0.45)', marginBottom: '2px', animation: 'fadeIn 0.5s ease-out 0.15s both', fontWeight: 500 }}>Crypto Wallet Analyzer</p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginBottom: '28px', animation: 'fadeIn 0.5s ease-out 0.25s both' }}>Analyze ETH & BTC wallets. Spot patterns. Detect anomalies.</p>

        {/* Feature cards */}
        <div className="flex justify-center" style={{ gap: '14px', marginBottom: '28px' }}>
          {[
            { icon: Scan, color: '#10b981', glow: 'rgba(16,185,129,0.08)', title: 'Deep Analysis', desc: 'Transaction history & patterns', delay: '0.3s' },
            { icon: TrendingUp, color: '#14b8a6', glow: 'rgba(20,184,166,0.08)', title: 'Visual Charts', desc: 'Interactive data visualization', delay: '0.38s' },
            { icon: Eye, color: '#0ea5e9', glow: 'rgba(14,165,233,0.08)', title: 'Anomaly Detection', desc: 'Flag suspicious activity', delay: '0.46s' },
          ].map((card) => (
            <div
              key={card.title}
              className="flex flex-col items-center backdrop-blur-sm cursor-default transition-all duration-300"
              style={{
                width: '110px',
                padding: '14px 10px 12px',
                gap: '4px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: `slideUp 0.4s ease-out ${card.delay} both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = card.glow;
                e.currentTarget.style.borderColor = `${card.color}30`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 16px ${card.glow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.025)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <card.icon style={{ width: '14px', height: '14px', color: card.color }} strokeWidth={1.5} />
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{card.title}</p>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', lineHeight: '1.6' }}>{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <div className="flex flex-col items-center" style={{ animation: 'slideUp 0.5s ease-out 0.55s both', gap: '10px' }}>
          {/* Hidden real Google button */}
          <div ref={googleBtnRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
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
              text="continue_with"
              shape="pill"
              width="260"
            />
          </div>

          {/* Custom visible button */}
          <span
            onClick={handleCustomClick}
            className="flex items-center justify-center cursor-pointer transition-all duration-300"
            style={{
              width: '260px',
              height: '44px',
              borderRadius: '22px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              gap: '10px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <GoogleIcon />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Continue with Google</span>
          </span>

          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.1)' }}>Secured with Google OAuth 2.0</p>
        </div>
      </div>
    </div>
  );
}
