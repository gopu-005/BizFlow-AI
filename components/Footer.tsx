'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 w-full py-4 text-center mt-auto border-t border-purple-100/60 bg-white/40 backdrop-blur-xs text-xs text-gray-500 font-medium shrink-0">
      <div className="flex items-center justify-center gap-1.5">
        <span>Product by</span>
        <span className="font-bold text-gray-800 tracking-wide font-heading">LyKSpire</span>
      </div>
    </footer>
  );
};
