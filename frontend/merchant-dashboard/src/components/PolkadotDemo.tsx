import React, { useState } from 'react';
import { PolkadotAddressInput } from './PolkadotAddressInput';
import { PolkadotBalanceDisplay } from './PolkadotBalanceDisplay';
import { PolkadotAmountInput } from './PolkadotAmountInput';
import { Wallet, Send, Settings, CheckCircle } from 'lucide-react';

export function PolkadotDemo() {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(false);

  // Mock data
  const mockBalance = '1000000000000'; // 100 DOT in smallest unit
  const mockUsdValue = 650.00; // $650 USD

  const handleSendPayment = () => {
    if (isAddressValid && isAmountValid) {
      alert(`Sending ${amount} DOT to ${address}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Polkadot UI Components</h1>
        <p className="text-gray-600">
          Inspired by <a href="https://polkadot-ui.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">polkadot-ui.com</a> - 
          Production-ready components for your PMT Gateway
        </p>
      </div>

      {/* Balance Display */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
          Balance Display
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">DOT Balance</p>
            <PolkadotBalanceDisplay 
              balance={mockBalance} 
              currency="DOT" 
              usdValue={mockUsdValue}
              size="lg"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">KSM Balance</p>
            <PolkadotBalanceDisplay 
              balance="500000000000" 
              currency="KSM" 
              usdValue={125.50}
              size="md"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">WND Balance</p>
            <PolkadotBalanceDisplay 
              balance="1000000000000" 
              currency="WND" 
              usdValue={0.00}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Send className="w-5 h-5 mr-2 text-blue-500" />
          Send Payment
        </h2>
        
        <div className="space-y-6">
          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <PolkadotAddressInput
              value={address}
              onChange={setAddress}
              placeholder="Enter recipient's Polkadot address..."
              onValidationChange={setIsAddressValid}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <PolkadotAmountInput
              value={amount}
              onChange={setAmount}
              currency="DOT"
              maxBalance="100"
              placeholder="Enter amount to send..."
              onValidationChange={setIsAmountValid}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendPayment}
            disabled={!isAddressValid || !isAmountValid}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isAddressValid && isAmountValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAddressValid && isAmountValid ? 'Send Payment' : 'Enter valid address and amount'}
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Address Validation</h3>
          <p className="text-gray-600 text-sm">
            Real-time SS58 address validation with visual feedback and identity lookup support.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Balance Display</h3>
          <p className="text-gray-600 text-sm">
            Formatted on-chain balances with USD conversion and proper decimal handling.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Amount Input</h3>
          <p className="text-gray-600 text-sm">
            Smart amount input with balance validation, max button, and error handling.
          </p>
        </div>
      </div>

      {/* Integration Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          🚀 Ready for Integration
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Type-safe:</strong> Built with TypeScript for better developer experience</p>
          <p>• <strong>Accessible:</strong> WCAG compliant with proper ARIA labels</p>
          <p>• <strong>Customizable:</strong> Tailwind CSS classes for easy theming</p>
          <p>• <strong>Production-ready:</strong> Error handling and validation built-in</p>
          <p>• <strong>Polkadot-native:</strong> Uses @polkadot/util-crypto for address validation</p>
        </div>
      </div>
    </div>
  );
}
