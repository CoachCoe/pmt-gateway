import React, { useState, useEffect } from 'react';
import { isValidAddress } from '@polkadot/util-crypto';

interface PolkadotAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export const PolkadotAddressInput: React.FC<PolkadotAddressInputProps> = ({
  value,
  onChange,
  placeholder = "Enter Polkadot address...",
  className = "",
  error,
  onValidationChange
}) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  useEffect(() => {
    if (value) {
      const valid = isValidAddress(value);
      setIsValid(valid);
      onValidationChange?.(valid);
    } else {
      setIsValid(false);
      onValidationChange?.(false);
    }
  }, [value, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsTouched(true);
  };

  const handleBlur = () => {
    setIsTouched(true);
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

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={getInputClasses()}
      />
      
      {isTouched && value && (
        <div className="text-sm">
          {isValid ? (
            <span className="text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Valid Polkadot address
            </span>
          ) : (
            <span className="text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Invalid address format
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
