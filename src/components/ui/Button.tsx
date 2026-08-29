import React from 'react'

export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }) {
  const base = 'inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
  const styles = variant === 'primary' ? 'bg-primary text-white hover:bg-primaryDark shadow-md shadow-primary/20' : 'border-2 border-primary text-primary bg-white hover:bg-blue-50'
  return <button className={`${base} ${styles} ${className}`} {...props} />
}