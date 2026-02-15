import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="h-screen w-screen bg-[#111] flex items-center justify-center">
      <div className="max-w-sm w-full px-8 text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" className="text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Welcome to ELSA</h1>
        <p className="text-sm text-gray-400 mb-10">AI-powered Bitcoin & Ethereum wallet analyzer</p>

        {/* Google Sign In */}
        <div className="flex justify-center">
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
            shape="rectangular"
          />
        </div>
      </div>
    </div>
  );
}
