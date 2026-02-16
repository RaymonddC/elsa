import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="h-screen w-screen bg-[#090909] flex items-center justify-center">
      <div className="max-w-sm w-full px-8 text-center">
        <p className="text-white/30 text-[13px] font-medium tracking-widest uppercase mb-4">ELSA</p>
        <h1 className="text-[28px] font-normal text-white/90 mb-3 tracking-tight">Welcome back</h1>
        <p className="text-[14px] text-white/30 mb-12">Sign in to continue analyzing wallets</p>

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
            size="medium"
            text="signin_with"
            shape="pill"
            width="250"
          />
        </div>
      </div>
    </div>
  );
}
