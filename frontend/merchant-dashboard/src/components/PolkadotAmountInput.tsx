import React, { useState, useEffect } from 'react';

interface PolkadotAmountInputProps {
  value: string;
  onChange: (amount: string) => void;
  currency: 'DOT' | 'KSM' | 'WND';
  maxBalance?: string | number;
  placeholder?: string;
  className?: string;
  error?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export const PolkadotAmountInput: React.FC<PolkadotAmountInputProps> = ({
  value,
  onChange,
  currency,
  maxBalance,
  placeholder,
  className = "",
  error,
  onValidationChange
}) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  useEffect(() => {
    if (value) {
      const num = parseFloat(value);
      const max = maxBalance ? (typeof maxBalance === 'string' ? parseFloat(maxBalance) : maxBalance) : Infinity;
      const valid = !isNaN(num) && num > 0 && num <= max;
      setIsValid(valid);
      onValidationChange?.(valid);
    } else {
      setIsValid(false);
      onValidationChange?.(false);
    }
  }, [value, maxBalance, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow only numbers and decimal point
    if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
      setIsTouched(true);
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const handleMaxClick = () => {
    if (maxBalance) {
      const max = typeof maxBalance === 'string' ? parseFloat(maxBalance) : maxBalance;
      onChange(max.toString());
      setIsTouched(true);
    }
  };

  const getInputClasses = () => {
    let classes = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ";
    
    if (isTouched && value) {
      if (isValid) {
        classes += "border-green-500 bg-green-50";
      } else {
        classes += "border-red-500 bg-red-50";
      }
    } else {
      classes += "border-gray-300";
    }
    
    return classes + " " + className;
  };

  const getValidationMessage = () => {
    if (!isTouched || !value) return null;
    
    if (!isValid) {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return "Please enter a valid number";
      } else if (num <= 0) {
        return "Amount must be greater than 0";
      } else if (maxBalance && num > (typeof maxBalance === 'string' ? parseFloat(maxBalance) : maxBalance)) {
        return "Amount exceeds available balance";
      }
    }
    
    return null;
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || `Enter amount in ${currency}...`}
          className={getInputClasses()}
        />
        
        {maxBalance && (
          <button
            type="button"
            onClick={handleMaxClick}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            MAX
          </button>
        )}
      </div>
      
      {isTouched && value && (
        <div className="text-sm">
          {isValid ? (
            <span className="text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Valid amount
            </span>
          ) : (
            <span className="text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {getValidationMessage()}
            </span>
          )}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
    </div>
  );
};
