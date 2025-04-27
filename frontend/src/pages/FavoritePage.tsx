import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { getFavoritesFromRedis, removeFavoriteFromRedis } from '../api/favorites';
import { fetchAllDiets, Diet } from '../api/diets';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const [favoritesFromRedis, allDiets] = await Promise.all([
          getFavoritesFromRedis(),
          fetchAllDiets()
        ]);
        setFavorites(favoritesFromRedis);
        setDiets(allDiets);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load favorites');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemove = async (e: React.MouseEvent, dietName: string) => {
    // Stop event propagation to prevent navigation when clicking the remove button
    e.stopPropagation();
    try {
      await removeFavoriteFromRedis(dietName);
      setFavorites((prev) => prev.filter((item) => item !== dietName));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to remove favorite');
    }
  };

  const navigateToDiet = (dietId: string) => {
    navigate(`/diets/${dietId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-lg text-primary-600">
          Loading favorites...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const favoriteDiets = diets.filter((diet) => favorites.includes(diet.diet_name));

  if (favoriteDiets.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg">
        <Heart className="mx-auto h-16 w-16 mb-4 text-primary-500" />
        <p className="text-xl text-gray-600">You haven't added any favorites yet</p>
        <button 
          onClick={() => navigate('/diets')}
          className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
        >
          Browse Diets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-8">
        <Heart className="h-8 w-8 mr-3 text-primary-500" />
        <h1 className="text-3xl font-bold text-primary-800">Your Favorites</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {favoriteDiets.map((diet) => (
          <div 
            key={diet._id} 
            onClick={() => navigateToDiet(diet._id)}
            className="group relative bg-white rounded-xl shadow-md border border-gray-100 p-5 transition-all hover:shadow-lg hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-primary-700 group-hover:text-primary-600">
                {diet.diet_name}
              </h3>
              <button
                onClick={(e) => handleRemove(e, diet.diet_name)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Remove from favorites"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            {diet.description && (
              <p className="mt-2 text-gray-600 line-clamp-2">
                {diet.description.slice(0, 100)}
                {diet.description.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;