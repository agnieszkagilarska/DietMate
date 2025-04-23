import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Star, ShoppingCart, Heart, Search, ChevronDown } from 'lucide-react';
import { fetchAllDiets, Diet } from '../api/diets';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';

const DietsPage: React.FC = () => {
  const { t } = useTranslation();
  const { cartItems, addToCart } = useCart();

  const [diets, setDiets] = useState<Diet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [caloriesFilter, setCaloriesFilter] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addToCartMessage, setAddToCartMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDiets()
      .then((data) => {
        setDiets(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load diets');
        setLoading(false);
      });
  }, []);

  const filteredDiets = diets.filter((diet) => {
    const matchesSearch =
      diet.diet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diet.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || diet.category === categoryFilter;
    const matchesCalories =
      !caloriesFilter ||
      (caloriesFilter === 'low' && diet.calories < 1500) ||
      (caloriesFilter === 'medium' && diet.calories >= 1500 && diet.calories <= 2000) ||
      (caloriesFilter === 'high' && diet.calories > 2000);

    return matchesSearch && matchesCategory && matchesCalories;
  });

  const sortedDiets = [...filteredDiets].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return b.rating - a.rating;
  });

  const categories = ['vegan', 'low-carb', 'vegetarian', 'keto', 'paleo'];
  const caloriesOptions = [
    { value: 'low', label: 'Low Calories' },
    { value: 'medium', label: 'Medium Calories' },
    { value: 'high', label: 'High Calories' },
  ];

  const handleAddToCart = (diet: Diet) => {
    addToCart({
      id: diet._id ?? '',
      name: diet.diet_name,
      description: diet.description,
      price: diet.price,
      quantity: 1, // <--- tylko +1, logika sumowania jest w CartContext
      image: diet.imageUrl || '/api/placeholder/400/300',
      duration: 'weekly',
    });
  
    setAddToCartMessage(`"${diet.diet_name}" has been added to your cart.`);
    setTimeout(() => {
      setAddToCartMessage(null);
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {addToCartMessage && (
        <div className="mb-4 p-4 text-sm bg-green-100 text-green-800 rounded-lg shadow">
          {addToCartMessage}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-secondary-800">Our Diets</h1>
        <p className="mt-2 text-secondary-600">
          Find the perfect meal plan for your lifestyle and goals
        </p>
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-secondary-400" />
            </div>
            <input
              type="text"
              placeholder="Search Diets"
              className="pl-10 w-full py-2 px-4 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-auto flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center py-2 px-4 text-secondary-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
              <ChevronDown
                className={`h-4 w-4 ml-1 transform transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-4 border border-gray-300 rounded-lg bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      !categoryFilter
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-white border-gray-300 text-secondary-700 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        categoryFilter === cat
                          ? 'bg-primary-100 border-primary-300 text-primary-800'
                          : 'bg-white border-gray-300 text-secondary-700 hover:bg-gray-50'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Calories
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCaloriesFilter('')}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      !caloriesFilter
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-white border-gray-300 text-secondary-700 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  {caloriesOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCaloriesFilter(opt.value)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        caloriesFilter === opt.value
                          ? 'bg-primary-100 border-primary-300 text-primary-800'
                          : 'bg-white border-gray-300 text-secondary-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-secondary-500 text-lg">Loading...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-lg">{error}</div>
      ) : sortedDiets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedDiets.map((diet) => (
            <div
              key={diet._id}
              className="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-lg transition-all border border-gray-100"
            >
              <Link to={`/diets/${diet._id}`} className="block">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={diet.imageUrl || `/api/placeholder/400/300`}
                    alt={diet.diet_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <button className="p-2 bg-white rounded-full text-secondary-400 hover:text-accent-500 shadow-sm">
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <span className="text-white text-sm font-medium px-2 py-1 rounded bg-primary-600">
                      {diet.category
                        ? diet.category.charAt(0).toUpperCase() +
                          diet.category.slice(1)
                        : 'Diet'}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-center text-accent-500 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(diet.rating) ? 'fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-secondary-600">
                    {diet.rating?.toFixed(1)} ({diet.rating || 0})
                  </span>
                </div>
                <Link to={`/diets/${diet._id}`} className="block">
                  <h3 className="text-lg font-bold font-heading text-secondary-800 mb-1">
                    {diet.diet_name}
                  </h3>
                  <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                    {diet.description}
                  </p>
                </Link>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-primary-600">
                    {diet.price || 199} zł
                  </span>
                  <button
                    onClick={() => handleAddToCart(diet)}
                    className="p-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-secondary-500 text-lg">No results found</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setCaloriesFilter('');
            }}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default DietsPage;