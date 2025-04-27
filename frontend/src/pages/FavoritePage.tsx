import React, { useEffect, useState } from 'react';
import { getFavoritesFromRedis, removeFavoriteFromRedis } from '../api/favorites';
import { Heart, Trash2 } from 'lucide-react';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const favs = await getFavoritesFromRedis();
        setFavorites(favs);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load favorites');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemove = async (dietName: string) => {
    try {
      await removeFavoriteFromRedis(dietName);
      setFavorites((prev) => prev.filter((item) => item !== dietName));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to remove favorite');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary-700">Loading favorites...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="p-8 text-center text-secondary-700">
        <Heart className="mx-auto h-10 w-10 mb-2 text-primary-600" />
        No favorites yet.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary-700">Your Favorites</h1>
      <ul className="space-y-4">
        {favorites.map((diet) => (
          <li key={diet} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
            <span className="text-secondary-800 font-medium">{diet}</span>
            <button
              onClick={() => handleRemove(diet)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FavoritesPage;
