import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  CreditCard,
  Info,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { incrementCartItem, deleteCartItem, getDietCountInCart } from '../api/cart';

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center w-full h-full p-8">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
        <p className="mt-4 text-secondary-600 font-medium">Loading...</p>
      </div>
    </div>
  );
};

const CartPage: React.FC = () => {
  const { 
    cartItems, 
    loadCartFromRedis, 
    removeFromCart, 
    updateCartItemQuantity 
  } = useCart();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCart = async () => {
      setIsInitialLoading(true);
      try {
        await loadCartFromRedis();
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadCart();
  }, [loadCartFromRedis]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const shippingFee = 0;
  const discount = couponApplied ? discountAmount : 0;
  const total = subtotal - discount + shippingFee;

  const handleQuantityChange = async (id: string, newQuantity: number, name: string) => {
    if (newQuantity < 1) return;
    
    updateCartItemQuantity(id, newQuantity);
    
    try {
      const increment = newQuantity - cartItems.find(item => item.id === id)?.quantity!;
      if (increment !== 0) {
        await incrementCartItem(name, increment);
      }
    } catch (error) {
      console.error('Error updating quantity in Redis:', error);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    removeFromCart(id);
  
    try {
      const countInRedis = await getDietCountInCart(name);
      if (countInRedis > 0) {
        await deleteCartItem(name, countInRedis);
      } else {
        console.warn('No such item found in Redis.');
      }
    } catch (error) {
      console.error('Error deleting item from Redis:', error);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }
    
    setIsCouponLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (couponCode.toLowerCase() === 'diet20') {
        setCouponApplied(true);
        setDiscountAmount(subtotal * 0.2);
        setCouponCode('');
      } else {
        setError('Invalid coupon code');
        setCouponApplied(false);
        setDiscountAmount(0);
      }
    } catch (err) {
      setError('Failed to apply coupon. Please try again.');
    } finally {
      setIsCouponLoading(false);
    }
  };


  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-primary-50 font-sans flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 font-sans">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-secondary-800 tracking-tight">
            Your Shopping Cart
          </h1>
          <p className="text-secondary-600 mt-2">
            Review and modify your selected diet plans
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100 text-center py-16">
            <div className="flex justify-center mb-4">
              <ShoppingCart className="h-16 w-16 text-secondary-300" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">
              Your cart is empty
            </h2>
            <p className="text-secondary-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any diet plans to your cart yet.
            </p>
            <Link
              to="/diets"
              className="inline-flex items-center py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-all"
            >
              Browse Diet Plans
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden mb-6 lg:mb-0">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-secondary-800 flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-primary-600" />
                    Cart Items (
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    )
                  </h2>
                </div>

                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row">
                      <div className="mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full sm:w-24 h-20 object-cover rounded-lg"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between mb-3">
                          <h3 className="font-medium text-secondary-800 text-lg">
                            {item.name}
                          </h3>
                          <div className="text-lg font-bold text-secondary-800 mt-1 sm:mt-0">
                            {(item.price * item.quantity).toFixed(2)} zł
                          </div>
                        </div>

                        <p className="text-secondary-600 text-sm mb-3">
                          {item.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <div className="text-sm text-secondary-600 mb-3 sm:mb-0">
                            <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                              {item.duration}
                            </span>
                          </div>

                          <div className="flex items-center">
                            <div className="flex items-center mr-4 border border-gray-200 rounded-lg">
                              <button
                                onClick={() =>
                                  handleQuantityChange(item.id, item.quantity - 1, item.name)
                                }
                                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-gray-50 rounded-l-lg transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center font-medium text-secondary-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(item.id, item.quantity + 1, item.name)
                                }
                                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-gray-50 rounded-r-lg transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemove(item.id, item.name)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-100">
                  <Link
                    to="/diets"
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 sticky top-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-secondary-800">
                    Order Summary
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Subtotal</span>
                      <span className="text-secondary-800 font-medium">
                        {subtotal.toFixed(2)} zł
                      </span>
                    </div>

                    {couponApplied && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount (20%)</span>
                        <span>-zł{discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-secondary-600">Shipping</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>

                    <div className="border-t border-gray-100 pt-4 flex justify-between">
                      <span className="text-lg font-bold text-secondary-800">
                        Total
                      </span>
                      <span className="text-lg font-bold text-secondary-800">
                        {total.toFixed(2)} zł
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="coupon"
                      className="block text-sm font-medium text-secondary-700 mb-1.5"
                    >
                      Have a promo code?
                    </label>

                    <div className="flex">
                      <input
                        id="coupon"
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter promo code"
                        className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-secondary-800 transition-all"
                        disabled={isCouponLoading}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={isCouponLoading}
                        className="bg-gray-100 hover:bg-gray-200 text-secondary-800 font-medium px-4 py-2 rounded-r-lg border border-gray-300 transition-colors min-w-20 flex items-center justify-center"
                      >
                        {isCouponLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                            <span className="ml-2 text-sm">Loading...</span>
                          </div>
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>

                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}

                    {couponApplied && (
                      <p className="mt-2 text-sm text-green-600">
                        Coupon applied successfully!
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-all flex items-center justify-center text-base"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Checkout
                  </button>

                  <div className="mt-4 flex items-center justify-center text-sm text-secondary-500">
                    <Info className="h-4 w-4 mr-1.5" />
                    Secure checkout
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;