import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
  } from 'react';
  
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
  }
  
  const CartContext = createContext<CartContextProps>({
    cartItems: [],
    addToCart: () => {},
    updateCartItemQuantity: () => {},
    removeFromCart: () => {},
    clearCart: () => {},
  });
  
  export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
    const addToCart = useCallback((item: CartItem) => {
      setCartItems((prev) => {
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
        }}
      >
        {children}
      </CartContext.Provider>
    );
  };
  
  export const useCart = () => {
    return useContext(CartContext);
  };
  