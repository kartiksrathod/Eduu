import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../api/api';
import ThemeToggle from './ThemeToggle';
import SmartSearchBar from './SmartSearchBar';
import ProfileAvatar from './ProfileAvatar';
import NotificationCenter from './NotificationCenter';
import { BookOpen, User, LogOut, Menu, X, Shield } from 'lucide-react';
const API_BASE_URL = "http://localhost:8001";

const Navbar = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Search functionality removed as requested

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/papers', label: 'Papers' },
    { path: '/notes', label: 'Notes' },
    { path: '/syllabus', label: 'Syllabus' },
    { path: '/announcements', label: '📢 Announcements' }
  ];

  // Search handler removed as requested

  const handleProfileClick = () => {
    navigate('/profile');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-foreground dark:text-white">EduResources</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-muted-foreground hover:text-blue-600 hover:bg-muted dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Global search removed as requested */}

          {/* Auth Section */}
          <div className="flex items-center space-x-2">
            <SmartSearchBar />
            <NotificationCenter />
            <ThemeToggle />
            
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-testid="user-menu-btn" variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {currentUser.profile_photo && (
                       <AvatarImage
                             src={currentUser.profile_photo ? `${API_BASE_URL}${currentUser.profile_photo}` : undefined}
                            alt={currentUser.name}
                      />

                      )}
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        {currentUser.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 dark:bg-gray-800 dark:border-gray-700" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium dark:text-white">{currentUser.name}</p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="dark:border-gray-600" />
                  
                  {/* Admin Status Display */}
                  {isAdmin && (
                    <div className="p-2 flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <Label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Admin User</Label>
                    </div>
                  )}
                  
                  <DropdownMenuSeparator className="dark:border-gray-600" />
                  
                  <DropdownMenuItem data-testid="profile-menu-item" onClick={handleProfileClick} className="dark:text-white dark:hover:bg-gray-700 cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="logout-menu-item" onClick={handleLogout} className="dark:text-white dark:hover:bg-gray-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link to="/login">
                  <Button data-testid="login-btn" variant="ghost" size="sm" className="dark:text-gray-300 dark:hover:bg-gray-800">Login</Button>
                </Link>
                <Link to="/register">
                  <Button data-testid="register-btn" size="sm" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">Register</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              data-testid="mobile-menu-btn"
              variant="ghost"
              size="sm"
              className="md:hidden dark:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search removed as requested */}

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t dark:border-gray-700">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-muted-foreground hover:text-blue-600 hover:bg-muted dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {!currentUser && (
                <div className="flex flex-col space-y-2 pt-4 border-t dark:border-gray-700">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button data-testid="mobile-login-btn" variant="ghost" className="w-full justify-start dark:text-gray-300 dark:hover:bg-gray-800">Login</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button data-testid="mobile-register-btn" className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">Register</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;