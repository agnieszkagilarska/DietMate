import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle
} from 'lucide-react';
import ConfettiIcons from '../components/common/ConfettiIcons';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValues.email || !formValues.password) {
      setError('Please enter your email or username and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, call actual API here
      console.log('Login attempt:', formValues.email);

      navigate('/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // In a real application, implement social login logic
    console.log(`Login with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-primary-50 flex font-sans relative">
      {/* Left section: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12">
        <div className="max-w-md w-full mx-auto">
          {/* Updated heading with different wording */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-heading text-secondary-800 tracking-tight">
              Hello Again
            </h1>
            <p className="text-secondary-600 mt-2 text-lg">
              Log in to continue your journey
            </p>
          </div>

          {/* Main Card with updated shadows and style */}
          <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-red-800 text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Login Form with improved spacing */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Username with updated styling */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    value={formValues.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Enter your email or username"
                  />
                </div>
              </div>

              {/* Password with updated styling */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-secondary-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formValues.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-secondary-400 hover:text-secondary-500 focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formValues.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2.5 block text-sm text-secondary-700"
                >
                  Remember me
                </label>
              </div>

              {/* Submit Button with updated styling */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-all flex items-center justify-center disabled:opacity-70 text-base"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                        5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign in
                  </>
                )}
              </button>
            </form>

            {/* Divider with improved styling */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-200 absolute w-full"></div>
              <div className="bg-white px-4 relative z-10 text-sm text-secondary-500 font-medium">
                or continue with
              </div>
            </div>

            {/* Social Login with improved styling */}
            <div className="mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center py-3 px-4 
                  border border-gray-300 rounded-lg hover:bg-gray-50 transition-all 
                  text-secondary-700 font-medium shadow-sm"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972
                    c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814
                    C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748
                    L12.545,10.239z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Sign Up Link with improved wording */}
            <div className="text-center">
              <p className="text-secondary-600">
                New to DietMate?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 
                    hover:text-primary-700 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right section: Branding & Confetti with updated styling */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
        {/* Render confetti-like 3D icons behind the text */}
        <ConfettiIcons />

        <div className="z-10 text-center px-12 max-w-lg">
          <h2 className="text-4xl font-bold text-secondary-800 mb-4">
            Discover <span className="text-primary-600">DietMate</span>
          </h2>
          <p className="text-secondary-700 text-lg">
            Your all-in-one solution for planning and tracking healthy meals.
            Start your journey toward better health today!
          </p>
          
          {/* Added feature highlights */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Personalized Meal Plans</h3>
                <p className="text-sm text-secondary-600">Tailored to your goals</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Nutrition Tracking</h3>
                <p className="text-sm text-secondary-600">Monitor your progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;