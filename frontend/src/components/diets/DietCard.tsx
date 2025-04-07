import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Diet } from '../../api/diets';

interface DietCardProps {
  diet: Diet;
}

const DietCard: React.FC<DietCardProps> = ({ diet }) => {
  return (
    <Link
      to={`/diets/name/${encodeURIComponent(diet.diet_name)}`}
      className="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-lg transition-all"
    >
      <div className="h-48 overflow-hidden">
        <img
          src={diet.imageUrl}
          alt={diet.diet_name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center text-accent-500 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < diet.rating ? 'fill-current' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-2 text-sm text-secondary-600">{diet.rating.toFixed(1)}</span>
        </div>
        <h3 className="text-xl font-bold font-heading text-secondary-800">
          {diet.diet_name}
        </h3>
        <p className="mt-2 text-secondary-600 line-clamp-3">{diet.description}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-lg font-bold text-primary-600">199 pln</span>
          <span className="text-sm text-secondary-500">/ week</span>
        </div>
      </div>
    </Link>
  );
};

export default DietCard;
