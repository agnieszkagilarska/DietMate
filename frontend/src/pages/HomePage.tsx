import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Heart, Star } from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { title: t('personalizedDiets'), description: t('personalizedDietsDesc'), icon: Heart },
    { title: t('healthyIngredients'), description: t('healthyIngredientsDesc'), icon: Check },
    { title: t('expertSupport'), description: t('expertSupportDesc'), icon: Star },
  ];

  const testimonials = [
    {
      name: 'Anna K.',
      text: t('testimonial1'),
      rating: 5,
    },
    {
      name: 'Marek W.',
      text: t('testimonial2'),
      rating: 5,
    },
    {
      name: 'Kasia B.',
      text: t('testimonial3'),
      rating: 4,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-20 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-20 z-10"></div>
          <img 
            src="/api/placeholder/1200/600" 
            alt="Healthy meal with fresh vegetables and greens" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 md:py-24 lg:py-32 relative z-20">
          <div className="lg:w-2/3">
            <h1 className="text-4xl font-bold font-heading tracking-tight sm:text-5xl md:text-6xl">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 text-xl md:text-2xl max-w-xl">
              {t('heroSubtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/diets"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 shadow-button transition-all"
              >
                {t('exploreDiets')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-accent-500 hover:bg-accent-600 shadow-button transition-all"
              >
                {t('getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold font-heading text-secondary-800 sm:text-4xl">
              {t('whyChooseUs')}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-secondary-600">
              {t('whyChooseUsSubtitle')}
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative p-8 bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-lg transition-shadow"
              >
                <div className="absolute top-0 -translate-y-1/2 bg-primary-600 rounded-full p-3 text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold font-heading text-secondary-800">
                  {feature.title}
                </h3>
                <p className="mt-4 text-secondary-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Diets Preview */}
      <section className="py-16 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-secondary-800">
              {t('popularDiets')}
            </h2>
            <Link
              to="/diets"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('viewAll')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Link
                key={item}
                to={`/diets/${item}`}
                className="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-lg transition-all"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={`/api/placeholder/400/320`}
                    alt={`Diet ${item}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center text-accent-500 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                    <span className="ml-2 text-sm text-secondary-600">5.0</span>
                  </div>
                  <h3 className="text-xl font-bold font-heading text-secondary-800">
                    {`${t('diet')} ${item}`}
                  </h3>
                  <p className="mt-2 text-secondary-600">
                    {t('dietShortDesc')}
                  </p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-primary-600">199 zł</span>
                    <span className="text-sm text-secondary-500">{t('perWeek')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold font-heading text-secondary-800 sm:text-4xl">
              {t('customerStories')}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-secondary-600">
              {t('customerStoriesSubtitle')}
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-white rounded-xl border border-gray-100 shadow-card"
              >
                <div className="flex items-center text-accent-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-5 w-5 ${i < testimonial.rating ? 'fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <p className="text-secondary-600 italic">"{testimonial.text}"</p>
                <p className="mt-4 font-medium text-secondary-800">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold font-heading sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-primary-100">
            {t('ctaSubtitle')}
          </p>
          <div className="mt-10">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 shadow-button transition-all"
            >
              {t('startNow')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;