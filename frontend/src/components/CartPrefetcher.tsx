import { useEffect } from 'react';
import { useCart } from '../context/CartContext';

const CartPrefetcher: React.FC = () => {
  const { loadCartFromRedis } = useCart();

  useEffect(() => {
    loadCartFromRedis();  // <<< Prefetch koszyka od razu przy starcie aplikacji
  }, [loadCartFromRedis]);

  return null; // <<< Komponent nic nie renderuje
};

export default CartPrefetcher;