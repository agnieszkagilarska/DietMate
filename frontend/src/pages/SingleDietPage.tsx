import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Star,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
} from 'lucide-react';

import { fetchDietById, Diet } from '../api/diets';
import { useCart } from '../context/CartContext';

const SingleDietPage: React.FC = () => {
  const { dietId } = useParams<{ dietId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { addToCart } = useCart();

  const [diet, setDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState('weekly');

  useEffect(() => {
    const fetchDiet = async () => {
      try {
        setLoading(true);
        if (!dietId) return;

        const data = await fetchDietById(dietId);
        setDiet(data);
      } catch (err) {
        console.error(err);
        setError('Diet not found');
      } finally {
        setLoading(false);
      }
    };

    fetchDiet();
  }, [dietId]);

  const handleQuantityChange = (value: number) => {
    if (value >= 1 && value <= 10) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    if (!diet) return;

    addToCart({
      id: diet._id || '',
      name: diet.diet_name,
      description: diet.description,
      price: diet.price,
      quantity,
      image: diet.imageUrl || '/api/placeholder/800/600',
      duration,
    });

    navigate('/cart');
  };

  const calculateTotalPrice = () => {
    if (!diet) return 0;
    const basePrice = diet.price * quantity;
    const multiplier = duration === 'monthly' ? 4 : 1;
    return basePrice * multiplier;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="mt-4 h-4 w-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !diet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-secondary-800">An error occurred</h2>
        <p className="mt-2 text-secondary-600">{error || 'Diet not found'}</p>
        <Link
          to="/diets"
          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-5 w-5 mr-1" /> Back to Diets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Back navigation */}
      <Link
        to="/diets"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-1" /> Back to Diets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Diet image */}
        <div className="rounded-xl overflow-hidden shadow-lg">
          <img
            src={diet.imageUrl || '/api/placeholder/800/600'}
            alt={diet.diet_name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Diet info */}
        <div>
          <div className="mb-4">
            <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800 mb-2">
              {diet.category}
            </span>
            <h1 className="text-3xl font-bold font-heading text-secondary-800">
              {diet.diet_name}
            </h1>

            <div className="flex items-center mt-2">
              <div className="flex items-center text-accent-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(diet.rating) ? 'fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-secondary-600">
                  {diet.rating.toFixed(1)} (Reviews)
                </span>
              </div>
            </div>

            <p className="mt-4 text-secondary-600">{diet.description}</p>
          </div>

          {/* Macros / Calories */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-primary-50 rounded-lg mb-6">
            <div className="text-center">
              <p className="text-xs text-secondary-600">Calories</p>
              <p className="font-bold text-secondary-800">{diet.calories} kcal</p>
            </div>
          </div>

          {/* Pricing and ordering */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-bold text-primary-600">
                {diet.price} zł
              </span>
              <span className="text-secondary-600">per week</span>
            </div>

            {/* Duration selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Duration
              </label>
              <div className="flex space-x-3">
                {['weekly', 'monthly'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setDuration(type)}
                    className={`flex-1 py-2 px-4 border rounded-md ${
                      duration === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-secondary-700 hover:bg-gray-50'
                    }`}
                  >
                    {type === 'weekly' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of people */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Number of People
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-2 border border-gray-300 rounded-md text-secondary-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 text-center border border-gray-300 rounded-md p-2"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10}
                  className="p-2 border border-gray-300 rounded-md text-secondary-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary + button */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-secondary-700">Total</span>
                <span className="text-xl font-bold text-primary-700">
                  {calculateTotalPrice()} zł
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-colors flex items-center justify-center"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </button>
            </div>
          </div>

          <button className="w-full py-2 px-4 border border-gray-300 text-secondary-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
            <Heart className="h-5 w-5 mr-2" />
            Save for Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleDietPage;