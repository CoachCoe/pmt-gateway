import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { useAuth } from '../hooks/useAuth'
import { Wallet, Loader2 } from 'lucide-react'

export function WalletConnect() {
  const { connectors, connect } = useConnect()
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signIn, isAuthenticating, error } = useAuth()

  // If connected, show sign in button
  if (isConnected) {
    return (
      <div className="space-y-4">
        <button
          onClick={signIn}
          disabled={isAuthenticating}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Signing...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Sign In</span>
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          onClick={() => disconnect()}
          className="w-full text-gray-600 text-sm hover:text-gray-900 transition-colors"
        >
          Disconnect Wallet
        </button>
      </div>
    )
  }

  // Show connect wallet buttons
  return (
    <div className="space-y-3">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          <Wallet className="w-5 h-5" />
          <span>Connect {connector.name}</span>
        </button>
      ))}

      <p className="text-xs text-gray-500 text-center mt-4">
        By connecting, you agree to our Terms of Service
      </p>
    </div>
  )
}
