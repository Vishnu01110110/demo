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
    <div className="w-full fixed top-0 z-50">
      <nav className={cn(
        "w-full max-w-2xl mx-auto mt-4",
        isOpen ? "" : "rounded-full shadow-[5px_5px_15px_rgba(0,0,0,0.15),-5px_-5px_15px_rgba(255,255,255,0.95)]",
        "bg-gradient-to-br from-gray-200 via-gray-100 to-white/90 backdrop-blur-sm transition-all duration-300"
      )}>
        <div className="flex items-center justify-between px-6 py-3 md:px-8">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-500">
              <CircleUserRound className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer">
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
            'md:hidden fixed left-0 right-0 top-[56px] bg-gray-100/80 backdrop-blur-sm shadow-lg border-t border-gray-200/50 transition-all duration-300 ease-in-out',
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
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