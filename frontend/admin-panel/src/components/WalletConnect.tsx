import { useConnect, useAccount } from 'wagmi';
import { Wallet, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS?.toLowerCase() || '';

export function WalletConnect() {
  const { connectors, connect, isPending } = useConnect();
  const { isConnected, address } = useAccount();
  const { isPlatformAdmin, isAuthenticating, signIn } = useAuth();

  if (isConnected && address) {
    if (!isPlatformAdmin) {
      return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Access Denied</h2>
          </div>
          <p className="text-red-700 mb-4">
            This admin panel is restricted to the platform address only.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600 mb-2">Your address:</p>
            <code className="text-xs text-red-600 break-all">{address}</code>
            <p className="text-sm text-gray-600 mt-4 mb-2">Platform address:</p>
            <code className="text-xs text-green-600 break-all">{PLATFORM_ADDRESS}</code>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Admin</h2>
          <p className="text-gray-600">Sign in to access the admin panel</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 font-medium mb-2">✓ Platform Address Verified</p>
          <code className="text-xs text-green-600 break-all">{address}</code>
        </div>

        <button
          onClick={signIn}
          disabled={isAuthenticating}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAuthenticating ? 'Authenticating...' : 'Sign In with Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <Wallet className="w-16 h-16 mx-auto mb-4 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
        <p className="text-gray-600">Connect your platform wallet to continue</p>
      </div>

      <div className="space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            {connector.name}
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Only the platform address can access this panel.
        </p>
      </div>
    </div>
  );
}
