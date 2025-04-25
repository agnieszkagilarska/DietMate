import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
  } from 'react';
import { getCartItemsFromRedis, getDietCountInCart } from '../api/cart';
import { fetchAllDiets } from '../api/diets';
  export interface CartItem {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    image: string;
    duration: string;
  }
  
  interface CartContextProps {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    updateCartItemQuantity: (id: string, newQuantity: number) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    loadCartFromRedis: () => Promise<void>;
  }
  
  const CartContext = createContext<CartContextProps>({
    cartItems: [],
    addToCart: () => {},
    updateCartItemQuantity: () => {},
    removeFromCart: () => {},
    clearCart: () => {},
    loadCartFromRedis: async () => {},
  });
  
  export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

const loadCartFromRedis = useCallback(async () => {
  try {
    const redisData = await getCartItemsFromRedis();
    const allDiets = await fetchAllDiets();

    const itemsFromRedis = await Promise.all(
      redisData.items.map(async (entry: any) => {
        const dietName = entry.value;
        const dietDetails = allDiets.find((diet) => diet.diet_name === dietName);

        if (!dietDetails) {
          console.warn(`Diet "${dietName}" not found in MongoDB.`);
          return null;
        }

        const count = await getDietCountInCart(dietName);

        return {
          id: dietDetails._id ?? dietName,
          name: dietDetails.diet_name,
          description: dietDetails.description,
          price: dietDetails.price,
          quantity: count,
          image: dietDetails.imageUrl || '/api/placeholder/400/300',
          duration: 'weekly',
        };
      })
    );

    setCartItems(itemsFromRedis.filter((item) => item !== null) as CartItem[]);
  } catch (error) {
    console.error('Failed to load cart from Redis:', error);
  }
}, []);
  
    const addToCart = useCallback((item: CartItem) => {
      setCartItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === item.id);
    
        if (existingIndex !== -1) {
          const updatedItems = [...prev];
          updatedItems[existingIndex].quantity += item.quantity;
          return updatedItems;
        }
    
        return [...prev, item];
      });
    }, []);
  
    const updateCartItemQuantity = useCallback((id: string, newQuantity: number) => {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }, []);
  
    const removeFromCart = useCallback((id: string) => {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    }, []);
  
    const clearCart = useCallback(() => {
      setCartItems([]);
    }, []);
  
    return (
      <CartContext.Provider
        value={{
          cartItems,
          addToCart,
          updateCartItemQuantity,
          removeFromCart,
          clearCart,
          loadCartFromRedis, // <<< DODAJ TUTAJ!
        }}
      >
        {children}
      </CartContext.Provider>
    );
  };
  
  export const useCart = () => {
    return useContext(CartContext);
  };
  