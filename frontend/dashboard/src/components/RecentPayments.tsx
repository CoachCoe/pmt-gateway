import { Link } from 'react-router-dom';
import { PaymentIntent } from '@/types';
import { formatCurrency, formatRelativeTime, truncateAddress } from '@/utils/format';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface RecentPaymentsProps {
  payments: PaymentIntent[];
}

const statusConfig = {
  SUCCEEDED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Success',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed',
  },
  PROCESSING: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Processing',
  },
  REQUIRES_PAYMENT: {
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Pending',
  },
  CANCELED: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Canceled',
  },
  EXPIRED: {
    icon: XCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Expired',
  },
};

export function RecentPayments({ payments }: RecentPaymentsProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No recent payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.slice(0, 5).map((payment) => {
        const status = statusConfig[payment.status] || statusConfig.REQUIRES_PAYMENT;
        const StatusIcon = status.icon;

        return (
          <Link
            key={payment.id}
            to={`/payments/${payment.id}`}
            className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${status.bgColor}`}>
                  <StatusIcon className={`h-4 w-4 ${status.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {payment.wallet_address ? truncateAddress(payment.wallet_address) : 'No wallet'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(payment.created_at)}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
      
      {payments.length > 5 && (
        <div className="text-center pt-3">
          <Link
            to="/payments"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all payments →
          </Link>
        </div>
      )}
    </div>
  );
}
