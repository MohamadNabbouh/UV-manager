'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleUVManagerClick = () => {
    router.push('/');
  };

  const handleUVPremClick = () => {
    router.push('/uvPrem');
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="flex items-center justify-between w-full px-6 py-4 bg-slate-900 border-b border-slate-700">
      {/* Left side - UV Manager */}
      <div 
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleUVManagerClick}
      >
        <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">UV</span>
        </div>
        <span className="text-white font-medium text-lg">UV Manager</span>
      </div>

      {/* Right side - UV Prem + Wallet */}
      <div className="flex items-center gap-4">
        {/* UV Prem Button - Consistent styling */}
        <button
          onClick={handleUVPremClick}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            pathname === '/uvPrem' 
              ? 'bg-violet-600 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white'
          }`}
        >
          UV Prem
        </button>

        {/* Wallet Address with Dropdown */}
        {address && (
          <div className="relative" ref={dropdownRef}>
            <div 
              className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="text-white text-sm font-mono">
                {formatAddress(address)}
              </span>
              <svg 
                className={`w-4 h-4 text-white transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Wallet Popup */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-6 z-50">
                {/* Close Button */}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="absolute top-4 right-4 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <div className="flex flex-wrap w-6 h-6">
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="text-center mb-2">
                  <div className="text-white font-bold text-lg font-mono">
                    {formatAddress(address)}
                  </div>
                </div>

                {/* Balance */}
                <div className="text-center mb-6">
                  <div className="text-slate-400 text-sm">
                    0 BERA
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyAddress}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Address
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
