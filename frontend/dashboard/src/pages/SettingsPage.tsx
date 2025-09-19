import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { apiService } from '@/services/api';
import { Merchant } from '@/types';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState<Partial<Merchant>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiService.getProfile(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Merchant>) => apiService.updateMerchantSettings(data),
    onSuccess: () => {
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: () => apiService.regenerateApiKey(),
    onSuccess: (data) => {
      toast.success('API key regenerated successfully');
      setApiKey(data.api_key);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to regenerate API key');
    },
  });

  const [apiKey, setApiKey] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(settings);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and API configuration
        </p>
      </div>

      {/* Profile Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Business Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={profile.name}
                onChange={handleChange}
                className="input mt-1"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={profile.email}
                onChange={handleChange}
                className="input mt-1"
                placeholder="Enter your email"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700">
              Webhook URL
            </label>
            <input
              type="url"
              id="webhook_url"
              name="webhook_url"
              defaultValue={profile.webhook_url || ''}
              onChange={handleChange}
              className="input mt-1"
              placeholder="https://your-domain.com/webhook"
            />
            <p className="mt-1 text-sm text-gray-500">
              URL where payment events will be sent
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn-primary btn-md"
            >
              {updateMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* API Key Management */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API Key Management</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current API Key
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey || 'pk_••••••••••••••••••••••••••••••••'}
                  readOnly
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(apiKey || '')}
                className="btn btn-outline btn-sm"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Keep your API key secure and never share it publicly
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Key className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Regenerate API Key
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  Generating a new API key will invalidate the current one. Make sure to update your integrations.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => regenerateApiKeyMutation.mutate()}
                    disabled={regenerateApiKeyMutation.isPending}
                    className="btn btn-outline btn-sm"
                  >
                    {regenerateApiKeyMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Regenerating...
                      </div>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Regenerate Key
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Guide</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">JavaScript SDK</h4>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100">
{`// Install the SDK
npm install @pmt-gateway/sdk

// Initialize the SDK
import { PMTGateway } from '@pmt-gateway/sdk';

const pmt = PMTGateway.create({
  publicKey: '${apiKey || 'pk_your_api_key_here'}',
  environment: 'test'
});

// Create a payment intent
const paymentIntent = await pmt.createPaymentIntent({
  amount: 2500, // $25.00 in cents
  currency: 'usd',
  crypto_currency: 'dot'
});

// Create a payment widget
const widget = pmt.createPaymentWidget({
  container: '#payment-widget',
  paymentIntent: paymentIntent,
  onSuccess: (event) => {
    console.log('Payment successful:', event);
  }
});`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Webhook Events</h4>
            <p className="text-sm text-gray-600 mb-2">
              Configure your webhook URL to receive payment events:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700">
{`POST ${profile.webhook_url || 'https://your-domain.com/webhook'}
Content-Type: application/json

{
  "type": "payment.succeeded",
  "paymentIntent": {
    "id": "pi_1234567890",
    "amount": 2500,
    "currency": "usd",
    "status": "SUCCEEDED",
    "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "transaction_hash": "0x123...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
