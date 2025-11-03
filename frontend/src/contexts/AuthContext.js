import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, profileAPI } from '../api/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCurrentUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const res = await profileAPI.get();
      const user = res.data;
      setCurrentUser(user);
      setIsAdmin(user.is_admin === true);
    } catch {
      setCurrentUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };
  checkAuth();
}, []);

  const login = async (email, password) => {
  const res = await authAPI.login({ email, password });
  
  // DEBUG LOGGING
  console.log('Login response:', res);
  console.log('Access token:', res.data.access_token);
  console.log('User:', res.data.user);

  const { access_token, user } = res.data;
  localStorage.setItem('token', access_token);

  setCurrentUser(user);
  setIsAdmin(user.is_admin === true);

  return user;
};


  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { user } = res.data;
    setCurrentUser(user);
    setIsAdmin(user.is_admin === true);
    return user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsAdmin(false);
  };

  const updateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const value = { currentUser, isAdmin, login, register, logout, updateUser, loading };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
