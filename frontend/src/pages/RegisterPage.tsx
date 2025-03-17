import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  UserPlus
} from 'lucide-react';


const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formValues.username || !formValues.email || !formValues.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formValues.agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, call actual API here
      console.log('Registration attempt:', formValues.email);
      navigate('/dashboard');
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    // In a real application, implement social signup logic
    console.log(`Sign up with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-primary-50 flex font-sans relative">
      {/* LEFT SECTION: Registration Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12">
        <div className="max-w-md w-full mx-auto">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-heading text-secondary-800 tracking-tight">
              Create Your Account
            </h1>
            <p className="text-secondary-600 mt-2 text-lg">
              Join us today and start your health journey
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

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formValues.username}
                    onChange={handleChange}
                    autoComplete="username"
                    className="w-full pl-11 pr-3 py-3 border border-gray-300 
                      rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
                      focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

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
                    value={formValues.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full pl-11 pr-3 py-3 border border-gray-300 
                      rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
                      focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Password
                </label>
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
                    autoComplete="new-password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 
                      rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
                      focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Create a password"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-secondary-400 hover:text-secondary-500 
                        focus:outline-none transition-colors"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formValues.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 
                      rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
                      focus:border-primary-500 text-secondary-800 shadow-sm transition-all"
                    placeholder="Confirm your password"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="text-secondary-400 hover:text-secondary-500 
                        focus:outline-none transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  id="agreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  checked={formValues.agreeTerms}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 
                    border-gray-300 rounded mt-1"
                />
                <label
                  htmlFor="agreeTerms"
                  className="ml-2.5 block text-sm text-secondary-700"
                >
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 
                  text-white font-medium rounded-lg shadow-button transition-all 
                  flex items-center justify-center disabled:opacity-70 text-base"
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
                      d="M4 12a8 8 0 018-8V0
                        C5.373 0 0 5.373 0 12h4zm2 
                        5.291A7.962 7.962 0 014 12H0
                        c0 3.042 1.135 5.824 3 7.938
                        l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-200 absolute w-full"></div>
              <div className="bg-white px-4 relative z-10 text-sm text-secondary-500 font-medium">
                or sign up with
              </div>
            </div>

            {/* Social Sign Up */}
            <div className="mb-6">
              <button
                onClick={() => handleSocialSignup('google')}
                className="w-full flex items-center justify-center py-3 px-4
                  border border-gray-300 rounded-lg hover:bg-gray-50 transition-all
                  text-secondary-700 font-medium shadow-sm"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445
                    c-0.712,2.315-2.647,3.972-5.445,3.972
                    c-3.332,0-6.033-2.701-6.033-6.032
                    s2.701-6.032,6.033-6.032
                    c1.498,0,2.866,0.549,3.921,1.453
                    l2.814-2.814C17.503,2.988,15.139,2,12.545,2
                    C7.021,2,2.543,6.477,2.543,12
                    s4.478,10,10.002,10
                    c8.396,0,10.249-7.85,9.426-11.748
                    L12.545,10.239z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-secondary-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 
                    hover:text-primary-700 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Branding & Confetti */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center 
        bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden"
      >

        <div className="z-10 text-center px-12 max-w-lg">
          <h2 className="text-4xl font-bold text-secondary-800 mb-4">
            Join <span className="text-primary-600">DietMate</span> Today
          </h2>
          <p className="text-secondary-700 text-lg">
            Create your personalized meal plans, track your nutrition, and achieve
            your health goals with our comprehensive platform.
          </p>

          {/* Feature highlights (2x2 grid) */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            {/* Feature 1 */}
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2
                       a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Personalized Plans</h3>
                <p className="text-sm text-secondary-600">Customized for your goals</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8v8m-4-5v5m-4-2v2
                       m-2 4h12a2 2 0 002-2V6
                       a2 2 0 00-2-2H6
                       a2 2 0 00-2 2v12
                       a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Progress Tracking</h3>
                <p className="text-sm text-secondary-600">Monitor your journey</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9
                       a5.002 5.002 0 006.001 0M6 7l3 9
                       M6 7l6-2m6 2l3-1m-3 1l-3 9
                       a5.002 5.002 0 006.001 0
                       M18 7l3 9m-3-9l-6-2
                       m0-2v2m0 16V5
                       m0 16H9m3 0h3"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Nutrition Analysis</h3>
                <p className="text-sm text-secondary-600">Optimize your diet</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-full shadow-md mr-3">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3
                       m6-3a9 9 0 11-18 0
                       9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-secondary-800">Meal Reminders</h3>
                <p className="text-sm text-secondary-600">Never miss a meal</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-10 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-secondary-700 italic text-sm">
              "DietMate transformed my relationship with food. The personalized meal plans fit perfectly with my
              lifestyle and dietary needs."
            </p>
            <p className="mt-2 text-primary-600 font-medium text-sm">
              — Sarah, Lost 15 pounds in 2 months
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
