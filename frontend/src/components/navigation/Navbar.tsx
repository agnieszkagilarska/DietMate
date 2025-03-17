import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { name: t('home'), path: '/' },
    { name: t('diets'), path: '/diets' },
    { name: t('cart'), path: '/cart', icon: ShoppingCart }
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m-8-4l8 4m8 8l-8 4m-8-4l8 4m-8-4v-8m16 0v8" />
                </svg>
                <span className="ml-2 text-xl font-heading font-bold text-primary-700">DieteMate</span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-secondary-600 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                {link.icon ? (
                  <div className="flex items-center">
                    <link.icon className="h-5 w-5 mr-1" />
                    {link.name}
                  </div>
                ) : (
                  link.name
                )}
              </Link>
            ))}
            <div className="ml-6 flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium rounded-md text-primary-700 hover:bg-primary-50"
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-button transition-all"
              >
                {t('register')}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <Link
              to="/cart"
              className="mr-4 p-2 rounded-full text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
            >
              <ShoppingCart className="h-6 w-6" />
            </Link>
            <button
              type="button"
              className="p-2 rounded-md text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks
              .filter((link) => !link.icon)
              .map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-3 py-2 rounded-md font-medium ${
                    isActive(link.path)
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-3">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 rounded-full text-secondary-400" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-secondary-800">{t('account')}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('register')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;