import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Download, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import { FilterOptions, SortOptions } from '@/types';
import { formatCurrency, formatDateTime, truncateAddress } from '@/utils/format';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

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

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sort, setSort] = useState<SortOptions>({ field: 'created_at', direction: 'desc' });
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payments', page, filters, sort, search],
    queryFn: () => apiService.getPaymentIntents(page, 20, { ...filters, search }, sort),
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        </div>
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        </div>
        <div className="card p-6">
          <div className="text-center text-red-600">
            <p>Failed to load payments</p>
            <button onClick={() => refetch()} className="btn btn-primary btn-sm mt-2">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => refetch()}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="btn btn-outline btn-sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="REQUIRES_PAYMENT">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SUCCEEDED">Success</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELED">Canceled</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={filters.currency || ''}
            onChange={(e) => handleFilterChange('currency', e.target.value)}
            className="input"
          >
            <option value="">All Currencies</option>
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
          </select>

          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Payments table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  ID
                  {sort.field === 'id' && (
                    <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  {sort.field === 'amount' && (
                    <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th>Status</th>
                <th>Wallet</th>
                <th 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  Date
                  {sort.field === 'created_at' && (
                    <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((payment) => {
                const status = statusConfig[payment.status] || statusConfig.REQUIRES_PAYMENT;
                const StatusIcon = status.icon;

                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="font-mono text-sm">
                      {payment.id.slice(0, 8)}...
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.crypto_amount} DOT
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {payment.wallet_address ? truncateAddress(payment.wallet_address) : '-'}
                    </td>
                    <td className="text-sm text-gray-500">
                      {formatDateTime(payment.created_at)}
                    </td>
                    <td>
                      <Link
                        to={`/payments/${payment.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                {data.pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.pagination.total_pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
