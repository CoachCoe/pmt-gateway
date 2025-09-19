import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import { formatCurrency, formatDateTime, truncateHash } from '@/utils/format';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

export function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => apiService.getPaymentIntent(id!),
    enabled: !!id,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="card p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Payment Not Found</h1>
          <p className="mt-2 text-gray-600">The payment you're looking for doesn't exist.</p>
          <Link to="/payments" className="btn btn-primary btn-md mt-4">
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[payment.status] || statusConfig.REQUIRES_PAYMENT;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/payments" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
          <p className="text-sm text-gray-500">ID: {payment.id}</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${status.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${status.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{status.label}</h3>
              <p className="text-sm text-gray-500">
                {formatDateTime(payment.created_at)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(payment.amount, payment.currency)}
            </div>
            <div className="text-sm text-gray-500">
              {payment.crypto_amount} DOT
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Payment ID</dt>
              <dd className="text-sm font-mono text-gray-900 flex items-center">
                {payment.id}
                <button
                  onClick={() => copyToClipboard(payment.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Amount</dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(payment.amount, payment.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Crypto Amount</dt>
              <dd className="text-sm text-gray-900">
                {payment.crypto_amount} {payment.crypto_currency.toUpperCase()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">
                {formatDateTime(payment.created_at)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Expires</dt>
              <dd className="text-sm text-gray-900">
                {formatDateTime(payment.expires_at)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Blockchain Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Blockchain Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Wallet Address</dt>
              <dd className="text-sm font-mono text-gray-900 flex items-center">
                {payment.wallet_address ? (
                  <>
                    {truncateHash(payment.wallet_address)}
                    <button
                      onClick={() => copyToClipboard(payment.wallet_address!)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Transaction Hash</dt>
              <dd className="text-sm font-mono text-gray-900 flex items-center">
                {payment.transaction_hash ? (
                  <>
                    {truncateHash(payment.transaction_hash)}
                    <button
                      onClick={() => copyToClipboard(payment.transaction_hash!)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={`https://polkadot.subscan.io/extrinsic/${payment.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                ) : (
                  <span className="text-gray-400">Not available</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(payment.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
