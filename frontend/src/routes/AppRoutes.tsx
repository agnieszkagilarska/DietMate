import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import DietsPage from '../pages/DietsPage';
import SingleDietPage from '../pages/SingleDietPage';
import CartPage from '../pages/CartPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import FavoritePage from '../pages/FavoritePage';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="diets" element={<DietsPage />} />
          <Route path="diets/:dietId" element={<SingleDietPage />} />
          <Route path ="/favorites" element={<FavoritePage />} />
          <Route path="cart" element={<CartPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<div>404 Not Found</div>} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;
