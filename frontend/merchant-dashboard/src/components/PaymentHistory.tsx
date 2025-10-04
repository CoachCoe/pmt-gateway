import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  crypto_amount: string
  crypto_currency: string
  status: string
  wallet_address: string | null
  transaction_hash: string | null
  created_at: string
  expires_at: string
}

const statusConfig = {
  REQUIRES_PAYMENT: { label: 'Awaiting Payment', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  PROCESSING: { label: 'Processing', icon: Loader2, color: 'text-blue-600 bg-blue-50' },
  SUCCEEDED: { label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  FAILED: { label: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-50' },
  CANCELED: { label: 'Canceled', icon: XCircle, color: 'text-gray-600 bg-gray-50' },
  EXPIRED: { label: 'Expired', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadPayments()
  }, [page])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const result = await api.getPaymentIntents({ page, limit: 20 })
      setPayments(result.paymentIntents)
      setTotal(result.total)
    } catch (err) {
      console.error('Failed to load payments:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment History</h2>
        <p className="text-sm text-gray-500">{total} total payments</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crypto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => {
                const status = statusConfig[payment.status as keyof typeof statusConfig]
                const Icon = status.icon

                return (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${(payment.amount / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">{payment.currency.toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.crypto_amount}</div>
                      <div className="text-xs text-gray-500">{payment.crypto_currency.toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{status.label}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.transaction_hash ? (
                        <a
                          href={`https://kusama.subscan.io/tx/${payment.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {payment.transaction_hash.substring(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
