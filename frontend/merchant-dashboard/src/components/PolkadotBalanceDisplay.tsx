import React from 'react';

interface PolkadotBalanceDisplayProps {
  balance: string | number;
  currency: 'DOT' | 'KSM' | 'WND';
  showUsd?: boolean;
  usdValue?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PolkadotBalanceDisplay: React.FC<PolkadotBalanceDisplayProps> = ({
  balance,
  currency,
  showUsd = true,
  usdValue,
  className = "",
  size = 'md'
}) => {
  const formatBalance = (balance: string | number, currency: string) => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    
    if (currency === 'DOT') {
      return `${(num / 1e10).toFixed(4)} DOT`;
    } else if (currency === 'KSM') {
      return `${(num / 1e12).toFixed(4)} KSM`;
    } else if (currency === 'WND') {
      return `${(num / 1e12).toFixed(4)} WND`;
    }
    
    return `${num.toFixed(4)} ${currency}`;
  };

  const formatUsd = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className={`font-mono ${getSizeClasses()}`}>
        {formatBalance(balance, currency)}
      </div>
      
      {showUsd && usdValue !== undefined && (
        <div className="text-sm text-gray-600">
          {formatUsd(usdValue)}
        </div>
      )}
    </div>
  );
};
