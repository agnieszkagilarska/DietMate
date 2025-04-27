import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import ConfettiIcons from '../components/common/ConfettiIcons';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, call actual API here
      console.log('Password reset requested for:', email);

      setEmailSent(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex font-sans relative">
      {/* Left section: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12">
        <div className="max-w-md w-full mx-auto">
          {/* Back to login link */}
          <div className="mb-6">
            <Link 
              to="/login" 
              className="flex items-center text-sm font-medium text-secondary-600 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </Link>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-heading text-secondary-800 tracking-tight">
              Forgot Password
            </h1>
            <p className="text-secondary-600 mt-2 text-lg">
              {emailSent 
                ? "We've sent you instructions to reset your password" 
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-red-800 text-sm font-medium">{error}</span>
              </div>
            )}

            {emailSent ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <CheckCircle className="h-10 w-10 text-primary-600" />
                  </div>
                </div>
                <h2 className="text-xl font-medium text-secondary-800 mb-3">Check Your Email</h2>
                <p className="text-secondary-600 mb-6">
                  We've sent a password reset link to <span className="font-medium">{email}</span>. 
                  Please check your inbox and follow the instructions.
                </p>
                <div className="border-t border-gray-200 pt-5 mt-2">
                  <p className="text-secondary-600 text-sm mb-4">
                    Didn't receive the email? Check your spam folder or:
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-primary-50 border border-primary-200 hover:bg-primary-100 text-primary-700 font-medium rounded-lg transition-all flex items-center justify-center"
                  >
                    Resend email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-secondary-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Mail className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={handleChange}
                      autoComplete="email"
                      className="w-full pl-11 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {/* Submit Button */}
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
                      <Send className="h-5 w-5 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Branding & Confetti */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
        {/* Render confetti-like 3D icons behind the text */}
        <ConfettiIcons />

        <div className="z-10 text-center px-12 max-w-lg">
          <h2 className="text-4xl font-bold text-secondary-800 mb-4">
            Reset your <span className="text-primary-600">DietMate</span> password
          </h2>
          <p className="text-secondary-700 text-lg">
            Don't worry, it happens to the best of us. We'll help you get back to planning and tracking your healthy meals in no time.
          </p>
          
          {/* Security note */}
          <div className="mt-8 bg-white bg-opacity-80 p-6 rounded-xl shadow-md text-left">
            <h3 className="font-medium text-lg text-secondary-800 mb-3 flex items-center">
              <svg className="h-5 w-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Security Tip
            </h3>
            <p className="text-secondary-700 text-sm mb-3">
              Make sure your new password is:
            </p>
            <ul className="space-y-2 text-sm text-secondary-700">
              <li className="flex items-start">
                <svg className="h-4 w-4 text-primary-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least 8 characters long
              </li>
              <li className="flex items-start">
                <svg className="h-4 w-4 text-primary-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Includes uppercase and lowercase letters
              </li>
              <li className="flex items-start">
                <svg className="h-4 w-4 text-primary-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Contains at least one number or special character
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;