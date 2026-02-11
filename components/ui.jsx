import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const base = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:bg-indigo-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};
