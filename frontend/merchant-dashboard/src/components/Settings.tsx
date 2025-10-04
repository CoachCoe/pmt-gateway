import { useAuth } from '../hooks/useAuth'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function Settings() {
  const { merchant } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (merchant?.walletAddress) {
      navigator.clipboard.writeText(merchant.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Merchant Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-6">Merchant Profile</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={merchant?.name || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={merchant?.walletAddress || ''}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                disabled
              />
              <button
                onClick={copyAddress}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-6">Payout Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payout Schedule
            </label>
            <select
              value={merchant?.payoutSchedule || 'WEEKLY'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            >
              <option value="INSTANT">Instant</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Configure this on-chain via smart contract
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Payout Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={merchant?.minPayoutAmount || '10.0'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                DOT
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform Fee
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-2xl font-bold text-gray-900">
                {(merchant?.platformFeeBps || 250) / 100}%
              </span>
              <span className="text-sm text-gray-500 ml-2">
                ({merchant?.platformFeeBps || 250} basis points)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-6">API Configuration</h3>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> To update your settings, interact directly with the smart contract on Kusama.
              Your preferences are stored on-chain for full transparency and decentralization.
            </p>
          </div>

          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            View on Block Explorer
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
        <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
          Deactivate Merchant Account
        </button>
        <p className="text-xs text-gray-500 mt-2">
          This will prevent new payments. Existing payments will be processed normally.
        </p>
      </div>
    </div>
  )
}
