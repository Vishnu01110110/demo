'use client';

import { useState } from 'react';
import { CircleUserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Chat', href: '#chat' },
    { name: 'Voice', href: '#voice' },
    { name: 'Backend', href: '#backend' },
  ];

  // Smooth scroll handler
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.querySelector(href as string);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full fixed top-0 z-50" style={{ background: 'var(--background)' }}>
      <nav
        className={cn(
          isOpen 
            ? "w-full bg-gray-100" 
            : "w-full max-w-2xl mx-auto mt-4 rounded-full bg-[#f9fafb]",
          "transition-all duration-300"
        )}
        style={!isOpen ? {
          boxShadow: "5px 5px 15px rgba(0, 0, 0, 0.15), -5px -5px 15px rgba(255, 255, 255, 0.95)",
        } : {}}
      >
        <div className="flex items-center justify-between px-6 py-3 md:px-8">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-500">
              <CircleUserRound className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer">
              Demo
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={handleClick}
                className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Hamburger Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-6 h-6 focus:outline-none"
              aria-label="Toggle Menu"
            >
              <span 
                className={cn(
                  "absolute block h-0.5 w-6 transform transition-all duration-300",
                  isOpen ? "rotate-45 top-3 bg-purple-600" : "top-2 bg-gray-600"
                )}
              />
              <span 
                className={cn(
                  "absolute block h-0.5 w-6 transform transition-all duration-300",
                  isOpen ? "-rotate-45 top-3 bg-purple-600" : "top-4 bg-gray-600"
                )}
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200',
            isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-4 py-2">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={handleClick}
                className="block text-gray-700 hover:text-purple-600 px-4 py-3 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}