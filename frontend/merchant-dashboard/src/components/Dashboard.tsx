import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'
import { WalletConnect } from './WalletConnect'
import { PaymentHistory } from './PaymentHistory'
import { Settings } from './Settings'
import { Stats } from './Stats'
import { PolkadotDemo } from './PolkadotDemo'
import { Wallet, Settings as SettingsIcon, BarChart3, LogOut, Code } from 'lucide-react'
import { useState } from 'react'

type Tab = 'overview' | 'payments' | 'settings' | 'polkadot-ui'

export function Dashboard() {
  const { isConnected } = useAccount()
  const { merchant, isAuthenticated, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Not connected - show wallet connect
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">PMT Gateway</h1>
          <p className="text-gray-600 mb-8">
            Merchant Dashboard
          </p>
          <WalletConnect />
          <p className="text-sm text-gray-500 mt-6">
            Connect your wallet to access the dashboard
          </p>
        </div>
      </div>
    )
  }

  // Connected but not authenticated - show sign in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
          <p className="text-gray-600 mb-8">
            Sign the message to authenticate
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  // Authenticated - show dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PMT Gateway</h1>
                <p className="text-xs text-gray-500">Merchant Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {merchant?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {merchant?.walletAddress?.substring(0, 6)}...
                  {merchant?.walletAddress?.substring(38)}
                </p>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 mt-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Wallet className="w-4 h-4 inline mr-2" />
              Payments
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="w-4 h-4 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('polkadot-ui')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'polkadot-ui'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Code className="w-4 h-4 inline mr-2" />
              Polkadot UI
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <Stats />}
        {activeTab === 'payments' && <PaymentHistory />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'polkadot-ui' && <PolkadotDemo />}
      </main>
    </div>
  )
}
