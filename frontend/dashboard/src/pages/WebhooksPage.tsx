import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '@/services/api';
// import { WebhookEvent } from '@/types';
import { formatDateTime } from '@/utils/format';
import toast from 'react-hot-toast';

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Pending',
  },
  DELIVERED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Delivered',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed',
  },
  RETRYING: {
    icon: RotateCcw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Retrying',
  },
};

export function WebhooksPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ status?: string; payment_intent_id?: string }>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['webhook-events', page, filters],
    queryFn: () => apiService.getWebhookEvents(page, 20, filters),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiService.retryWebhookEvent(id),
    onSuccess: () => {
      toast.success('Webhook retry initiated');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to retry webhook');
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Webhook Events</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Webhook Events</h1>
        </div>
        <div className="card p-6">
          <div className="text-center text-red-600">
            <p>Failed to load webhook events</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Webhook Events</h1>
        <button
          onClick={() => refetch()}
          className="btn btn-outline btn-sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="RETRYING">Retrying</option>
          </select>

          <input
            type="text"
            placeholder="Payment Intent ID"
            value={filters.payment_intent_id || ''}
            onChange={(e) => handleFilterChange('payment_intent_id', e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Webhook events table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Payment Intent</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
                <th>Delivered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.events.map((event) => {
                const status = statusConfig[event.status] || statusConfig.PENDING;
                const StatusIcon = status.icon;

                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="font-medium">
                      {event.type}
                    </td>
                    <td className="font-mono text-sm">
                      {event.paymentId.slice(0, 8)}...
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {event.attempts}/3
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="text-sm text-gray-500">
                      {event.lastAttemptAt ? formatDateTime(event.lastAttemptAt) : '-'}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            // Show payload modal
                            console.log('Event:', event);
                          }}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {event.status === 'FAILED' && (
                          <button
                            onClick={() => retryMutation.mutate(event.id)}
                            disabled={retryMutation.isPending}
                            className="text-yellow-600 hover:text-yellow-700 text-sm font-medium disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
