import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  CreditCard,
  Info,
  ArrowLeft
} from 'lucide-react';

interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  duration: string;
}

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: 'Balanced Diet Plan',
      description: 'A well-balanced meal plan with optimal macronutrient distribution.',
      price: 89.99,
      quantity: 1,
      image: '/api/placeholder/150/100',
      duration: '1 month'
    },
    {
      id: 2,
      name: 'Keto Diet Plan',
      description: 'Low-carb, high-fat meal plan designed for ketosis.',
      price: 99.99,
      quantity: 1,
      image: '/api/placeholder/150/100',
      duration: '1 month'
    },
    {
      id: 3,
      name: 'Vegetarian Diet Plan',
      description: 'Plant-based meal plan rich in nutrients and protein alternatives.',
      price: 79.99,
      quantity: 2,
      image: '/api/placeholder/150/100',
      duration: '1 month'
    }
  ]);
  
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = 0;
  const discount = couponApplied ? discountAmount : 0;
  const total = subtotal - discount + shippingFee;

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setCartItems(
      cartItems.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 font-sans">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-secondary-800 tracking-tight">
            Your Shopping Cart
          </h1>
          <p className="text-secondary-600 mt-2">
            Review and modify your selected diet plans
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty cart state */
          <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100 text-center py-16">
            <div className="flex justify-center mb-4">
              <ShoppingCart className="h-16 w-16 text-secondary-300" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Your cart is empty</h2>
            <p className="text-secondary-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any diet plans to your cart yet. Explore our plans to find the perfect fit for your health goals.
            </p>
            <Link
              to="/diets"
              className="inline-flex items-center py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-all"
            >
              Browse Diet Plans
            </Link>
          </div>
        ) : (
          /* Cart with items */
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Cart items section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden mb-6 lg:mb-0">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-secondary-800 flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-primary-600" />
                    Cart Items ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
                  </h2>
                </div>

                {/* Cart items list */}
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row">
                      {/* Item image */}
                      <div className="mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full sm:w-24 h-20 object-cover rounded-lg"
                        />
                      </div>
                      
                      {/* Item details */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between mb-3">
                          <h3 className="font-medium text-secondary-800 text-lg">{item.name}</h3>
                          <div className="text-lg font-bold text-secondary-800 mt-1 sm:mt-0">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        
                        <p className="text-secondary-600 text-sm mb-3">{item.description}</p>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <div className="text-sm text-secondary-600 mb-3 sm:mb-0">
                            <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                              {item.duration}
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            {/* Quantity controls */}
                            <div className="flex items-center mr-4 border border-gray-200 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-gray-50 rounded-l-lg transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center font-medium text-secondary-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-gray-50 rounded-r-lg transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Remove button */}
                            <button
                              onClick={() => removeItem(item.id)}
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
                
                {/* Continue shopping link */}
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

            {/* Order summary section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 sticky top-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-secondary-800">Order Summary</h2>
                </div>
                
                <div className="p-6">
                  {/* Price summary */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Subtotal</span>
                      <span className="text-secondary-800 font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    {couponApplied && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount (20%)</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Shipping</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 flex justify-between">
                      <span className="text-lg font-bold text-secondary-800">Total</span>
                      <span className="text-lg font-bold text-secondary-800">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Coupon code input */}
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
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={isLoading}
                        className="bg-gray-100 hover:bg-gray-200 text-secondary-800 font-medium px-4 py-2 rounded-r-lg border border-gray-300 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                    
                    {couponApplied && (
                      <p className="mt-2 text-sm text-green-600">Coupon applied successfully!</p>
                    )}
                  </div>
                  
                  {/* Checkout button */}
                  <button
                    type="button"
                    className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-all flex items-center justify-center text-base"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Checkout
                  </button>
                  
                  {/* Secure checkout note */}
                  <div className="mt-4 flex items-center justify-center text-sm text-secondary-500">
                    <Info className="h-4 w-4 mr-1.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Recommended items section */}
        {cartItems.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-secondary-800 mb-6">You might also like</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Recommended item 1 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <img 
                  src="/api/placeholder/400/200" 
                  alt="Recommended diet plan" 
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-medium text-secondary-800">Fitness Diet Plan</h3>
                  <p className="text-sm text-secondary-600 mt-1 mb-3">High-protein meal plan for active individuals</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-secondary-800">$109.99</span>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Recommended item 2 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <img 
                  src="/api/placeholder/400/200" 
                  alt="Recommended diet plan" 
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-medium text-secondary-800">Mediterranean Diet Plan</h3>
                  <p className="text-sm text-secondary-600 mt-1 mb-3">Heart-healthy meals inspired by Mediterranean cuisine</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-secondary-800">$94.99</span>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Recommended item 3 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <img 
                  src="/api/placeholder/400/200" 
                  alt="Recommended diet plan" 
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-medium text-secondary-800">Diabetes-Friendly Diet Plan</h3>
                  <p className="text-sm text-secondary-600 mt-1 mb-3">Low-glycemic meal plan to help maintain stable blood sugar</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-secondary-800">$119.99</span>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
                      Add to Cart
                    </button>
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