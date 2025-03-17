import React from 'react';

const CartPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Cart</h1>
      <p className="text-gray-700">Your selected diets will appear here.</p>
      <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
        Proceed to Checkout
      </button>
    </div>
  );
};

export default CartPage;
