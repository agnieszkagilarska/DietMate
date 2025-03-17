import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Star,
  Heart,
  Clock,
  Calendar,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  MessageCircle,
  Award
} from 'lucide-react';

// Interfejs dla typu diety
interface Diet {
  id: number;
  title: string;
  description: string;
  longDescription: string;
  rating: number;
  reviews: number;
  price: number;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  features: string[];
  faq: Array<{question: string; answer: string}>;
  imageUrl?: string;
}

const SingleDietPage: React.FC = () => {
  const { dietId } = useParams<{ dietId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState('weekly');
  const [activeTab, setActiveTab] = useState('description');

  // W rzeczywistej aplikacji, to byłoby zastąpione wywołaniem API
  useEffect(() => {
    const fetchDiet = async () => {
      try {
        setLoading(true);
        
        // Tutaj zasymulujemy pobieranie danych z API
        // W rzeczywistej aplikacji, tutaj byłoby wywołanie API
        setTimeout(() => {
          // Symulacja danych z API
          const mockDiet: Diet = {
            id: Number(dietId),
            title: `Dieta ${dietId}`,
            description: 'Zbilansowana dieta bogata w składniki odżywcze, idealna dla zdrowego stylu życia.',
            longDescription: 'Szczegółowy opis diety, zawierający informacje o korzyściach, składnikach i sposobie przygotowania posiłków.',
            rating: 4.8,
            reviews: 125,
            price: 249,
            category: 'balanced',
            calories: 1800,
            protein: 120,
            carbs: 200,
            fat: 60,
            features: [
              'Posiłki przygotowane przez profesjonalnych kucharzy',
              'Dostarczana codziennie pod wskazany adres',
              '5 posiłków dziennie',
              'Indywidualne dostosowanie do alergii i preferencji',
              'Wsparcie dedykowanego dietetyka'
            ],
            faq: [
              {
                question: 'Czy mogę dostosować dietę do swoich alergii?',
                answer: 'Tak, podczas składania zamówienia możesz zgłosić swoje alergie i nietolerancje pokarmowe, a my dostosujemy posiłki odpowiednio do Twoich potrzeb.'
              },
              {
                question: 'O której dostarczane są posiłki?',
                answer: 'Posiłki dostarczamy codziennie w godzinach 5:00-9:00 rano, dzięki czemu masz je gotowe na cały dzień.'
              }
            ]
          };
          
          setDiet(mockDiet);
          setLoading(false);
        }, 500);
        
      } catch (err) {
        setError('Nie udało się pobrać informacji o diecie.');
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
    // Tutaj logika dodawania do koszyka
    console.log(`Dodano do koszyka: Dieta ID ${dietId}, ilość: ${quantity}, okres: ${duration}`);
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
          <div className="h-6 w-40 bg-gray-200 rounded"></div>
          <div className="mt-4 h-4 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !diet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-secondary-800">{t('errorOccurred')}</h2>
        <p className="mt-2 text-secondary-600">{error || t('dietNotFound')}</p>
        <Link to="/diets" className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-5 w-5 mr-1" /> {t('backToDiets')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Nawigacja powrotu */}
      <Link to="/diets" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="h-5 w-5 mr-1" /> {t('backToDiets')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zdjęcie diety */}
        <div className="rounded-xl overflow-hidden shadow-lg">
          <img 
            src={diet.imageUrl || `/api/placeholder/800/600`}
            alt={diet.title}
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Informacje o diecie */}
        <div>
          <div className="mb-4">
            <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800 mb-2">
              {t(diet.category)}
            </span>
            <h1 className="text-3xl font-bold font-heading text-secondary-800">{diet.title}</h1>
            
            <div className="flex items-center mt-2">
              <div className="flex items-center text-accent-500">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < Math.floor(diet.rating) ? 'fill-current' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 text-sm text-secondary-600">
                  {diet.rating.toFixed(1)} ({diet.reviews} {t('reviews')})
                </span>
              </div>
            </div>
            
            <p className="mt-4 text-secondary-600">{diet.description}</p>
          </div>

          {/* Makroskładniki */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-primary-50 rounded-lg mb-6">
            <div className="text-center">
              <p className="text-xs text-secondary-600">{t('calories')}</p>
              <p className="font-bold text-secondary-800">{diet.calories} kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-600">{t('protein')}</p>
              <p className="font-bold text-secondary-800">{diet.protein}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-600">{t('carbs')}</p>
              <p className="font-bold text-secondary-800">{diet.carbs}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-600">{t('fat')}</p>
              <p className="font-bold text-secondary-800">{diet.fat}g</p>
            </div>
          </div>

          {/* Sekcja cenowa i zamówienia */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-bold text-primary-600">{diet.price} zł</span>
              <span className="text-secondary-600">{t('perWeek')}</span>
            </div>

            {/* Wybór czasu trwania */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {t('duration')}
              </label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDuration('weekly')}
                  className={`flex-1 py-2 px-4 border rounded-md ${
                    duration === 'weekly'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-secondary-700 hover:bg-gray-50'
                  }`}
                >
                  {t('weekly')}
                </button>
                <button
                  onClick={() => setDuration('monthly')}
                  className={`flex-1 py-2 px-4 border rounded-md ${
                    duration === 'monthly'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-secondary-700 hover:bg-gray-50'
                  }`}
                >
                  {t('monthly')}
                </button>
              </div>
            </div>

            {/* Wybór ilości osób */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {t('peopleCount')}
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

            {/* Podsumowanie i przycisk do koszyka */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-secondary-700">{t('total')}</span>
                <span className="text-xl font-bold text-primary-700">{calculateTotalPrice()} zł</span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-colors flex items-center justify-center"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('addToCart')}
              </button>
            </div>
          </div>

          {/* Zapisz na później */}
          <button className="w-full py-2 px-4 border border-gray-300 text-secondary-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
            <Heart className="h-5 w-5 mr-2" />
            {t('saveForLater')}
          </button>
        </div>
      </div>

      {/* Karty z dodatkowymi informacjami */}
      <div className="mt-12">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-4 px-6 font-medium whitespace-nowrap ${
                activeTab === 'description'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800'
              }`}
            >
              {t('description')}
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`py-4 px-6 font-medium whitespace-nowrap ${
                activeTab === 'features'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800'
              }`}
            >
              {t('features')}
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-4 px-6 font-medium whitespace-nowrap ${
                activeTab === 'faq'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800'
              }`}
            >
              {t('faq')}
            </button>
          </div>
        </div>

        <div className="py-6">
          {activeTab === 'description' && (
            <div className="prose max-w-none text-secondary-700">
              <p>{diet.longDescription}</p>
            </div>
          )}

{activeTab === 'features' && (
            <div>
              <h3 className="text-xl font-bold font-heading text-secondary-800 mb-4">
                {t('whatYouGet')}
              </h3>
              <ul className="space-y-4">
                {diet.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-600" />
                    </div>
                    <p className="ml-3 text-secondary-700">{feature}</p>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8 flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-primary-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-secondary-800">{t('startToday')}</h4>
                    <p className="text-sm text-secondary-600">{t('nextDayDelivery')}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-primary-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-secondary-800">{t('deliveryTime')}</h4>
                    <p className="text-sm text-secondary-600">5:00 - 9:00</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold font-heading text-secondary-800 mb-4">
                {t('frequentlyAskedQuestions')}
              </h3>
              
              <div className="divide-y divide-gray-200">
                {diet.faq.map((item, index) => (
                  <div key={index} className="py-4">
                    <h4 className="text-lg font-medium text-secondary-800 mb-2">
                      {item.question}
                    </h4>
                    <p className="text-secondary-600">{item.answer}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-secondary-800">{t('stillHaveQuestions')}</h4>
                    <p className="text-sm text-secondary-600">{t('contactSupport')}</p>
                  </div>
                  <button className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-button transition-colors flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    {t('contactUs')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rekomendacje */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold font-heading text-secondary-800 mb-6">
          {t('youMightAlsoLike')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rekomendowane diety będą tutaj */}
          {/* To jest tylko przykład, w rzeczywistej aplikacji dane byłyby pobierane z API */}
          {[1, 2, 3].map((id) => (
            <div key={id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-100">
                <img 
                  src={`/api/placeholder/400/300`} 
                  alt={`Rekomendowana dieta ${id}`}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-secondary-800 mb-1">
                  {`Dieta rekomendowana ${id}`}
                </h3>
                <p className="text-sm text-secondary-600 mb-3">
                  {`Krótki opis rekomendowanej diety ${id}`}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary-600">199 zł</span>
                  <Link 
                    to={`/diets/${id}`} 
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {t('viewDetails')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opinie i recenzje - można dodać w przyszłości */}
      <div className="mt-16 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-heading text-secondary-800">
            {t('reviews')} ({diet.reviews})
          </h2>
          <button className="py-2 px-4 border border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors">
            {t('writeReview')}
          </button>
        </div>
        
        {/* Tutaj byłyby recenzje */}
        <div className="p-8 border border-gray-200 rounded-lg text-center">
          <Award className="h-12 w-12 text-primary-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-secondary-800 mb-2">
            {t('topRatedDiet')}
          </h3>
          <p className="text-secondary-600 mb-4">
            {t('dietRatingDescription')}
          </p>
          <div className="flex items-center justify-center text-accent-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-current" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleDietPage;