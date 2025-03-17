import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="p-4 text-center bg-gray-100 border-t">
        <p className="text-sm text-gray-600">© 2025 Diets App</p>
      </footer>
    </div>
  );
};

export default MainLayout;
