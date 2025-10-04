import { useState, useEffect } from 'react';
import { Wallet, ArrowDownToLine, ExternalLink, RefreshCcw } from 'lucide-react';
import { api } from '../lib/api';

export function FeeWithdrawal() {
  const [balance, setBalance] = useState('0');
  const [balanceUSD, setBalanceUSD] = useState('0');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await api.getPlatformBalance();
      setBalance(data.balance);
      setBalanceUSD(data.balanceUSD);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      setError('Amount exceeds available balance');
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const result = await api.withdrawFees(withdrawAmount);
      setTxHash(result.txHash);
      setWithdrawAmount('');
      // Reload balance after withdrawal
      setTimeout(loadBalance, 2000);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const setMaxAmount = () => {
    setWithdrawAmount(balance);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-purple-600" />
        Fee Withdrawal
      </h2>

      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-purple-100 text-sm mb-1">Platform Fee Balance</p>
            <p className="text-3xl font-bold">{balance} DOT</p>
            <p className="text-purple-200 text-sm mt-1">≈ ${balanceUSD} USD</p>
          </div>
          <button
            onClick={loadBalance}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Refresh balance"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Withdraw Fees</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (DOT)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={setMaxAmount}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                MAX
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">
                ✓ Withdrawal Successful
              </p>
              <a
                href={`https://kusama.subscan.io/extrinsic/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:text-green-800 flex items-center gap-1 font-mono"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-5 h-5" />
                Withdraw to Platform Wallet
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Fees will be withdrawn from the escrow contract to your
            platform wallet address. This transaction requires gas fees.
          </p>
        </div>
      </div>
    </div>
  );
}
