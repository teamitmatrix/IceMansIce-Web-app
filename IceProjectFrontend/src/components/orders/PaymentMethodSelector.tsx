"use client";
import { Badge } from '@/components/ui/badge';
import { ReactNode } from 'react';

export interface PaymentOption {
  value: 'cash' | 'online';
  label: string;
  description: string;
  icon?: ReactNode;
}

interface Props {
  value: 'cash' | 'online';
  onChange: (val: 'cash' | 'online') => void;
  options?: PaymentOption[];
  className?: string;
}

const defaultOptions: PaymentOption[] = [
  { value: 'cash', label: 'Cash', description: 'Pay cash on delivery', icon: <span>💵</span> },
  { value: 'online', label: 'Pay Online', description: 'Secure online payment', icon: <span>🌐</span> }
];

export function PaymentMethodSelector({ value, onChange, options = defaultOptions, className = '' }: Props) {
  return (
    <div className={`grid sm:grid-cols-2 gap-3 ${className}`}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative cursor-pointer rounded-lg border p-3 flex flex-col text-left transition shadow-sm hover:shadow-md text-sm ${active ? 'border-blue-600 ring-2 ring-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
          >
            <div className="flex items-center mb-1">
              <span className="text-lg mr-2" aria-hidden>{opt.icon}</span>
              <span className="font-semibold text-gray-800">{opt.label}</span>
            </div>
            <p className="text-gray-600 text-xs leading-snug line-clamp-2">{opt.description}</p>
            {active && (
              <Badge className="absolute top-2 right-2 bg-blue-600 text-white">Selected</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
