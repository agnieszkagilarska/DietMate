import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from '../common/Logo';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/');
  };

  const navLinks = [
    { name: t('Home'), path: '/' },
    { name: t('Diets'), path: '/diets' },
    { name: '', path: '/favorites', icon: Heart, iconOnly: true, requiresAuth: true },
    { name: t('Cart'), path: '/cart', icon: ShoppingCart }
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo />
              <span className="ml-2 text-xl font-heading font-bold text-primary-700">DieteMate</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => (
              (!link.requiresAuth || (link.requiresAuth && isAuthenticated)) && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center ${
                    isActive(link.path)
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                  title={link.iconOnly ? t('Favorites') : ''}
                >
                  {link.icon ? (
                    link.iconOnly ? (
                      <link.icon className="h-5 w-5" />
                    ) : (
                      <div className="flex items-center">
                        <link.icon className="h-5 w-5 mr-1" />
                        {link.name}
                      </div>
                    )
                  ) : (
                    link.name
                  )}
                </Link>
              )
            ))}

            <div className="ml-6 flex items-center space-x-4">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-button transition-all"
                >
                  {t('Logout')}
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium rounded-md text-primary-700 hover:bg-primary-50"
                  >
                    {t('Login')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-button transition-all"
                  >
                    {t('Register')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            {isAuthenticated && (
              <Link
                to="/favorites"
                className="mr-2 p-2 rounded-full text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                title={t('Favorites')}
              >
                <Heart className="h-6 w-6" />
              </Link>
            )}
            <Link
              to="/cart"
              className="mr-2 p-2 rounded-full text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
              title={t('Cart')}
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
              .filter(link => !link.iconOnly && (!link.requiresAuth || (link.requiresAuth && isAuthenticated)))
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
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isAuthenticated ? (
              <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
              >
                {t('Logout')}
              </button>
            ) : (
              <div className="space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('Register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;