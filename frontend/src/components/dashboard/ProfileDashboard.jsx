import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI, bookmarksAPI, achievementsAPI, learningGoalsAPI, papersAPI, notesAPI, syllabusAPI, statsAPI } from '../../api/api';
import { useToast } from '../../hooks/use-toast';
import { 
  User, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Download, 
  Calendar,
  Award,
  Activity,
  TrendingUp,
  Sparkles,
  Camera,
  Lock,
  Heart,
  Target,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Bookmark, 
  Trophy,
  CheckCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


const ProfileDashboard = () => {
  const { currentUser, isAdmin, updateUser } = useAuth();
  const { toast } = useToast();
  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const API_BASE_URL = "http://localhost:8001";

  const photoUrl = currentUser?.profile_photo
    ? `${API_BASE_URL}${currentUser.profile_photo}`
    : null;
  // State for tabs
  const [activeTab, setActiveTab] = useState('overview');
  
  // Profile states
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Bookmarks states
  const [bookmarks, setBookmarks] = useState([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [bookmarkTypeFilter, setBookmarkTypeFilter] = useState('all');
  const [bookmarkCategoryFilter, setBookmarkCategoryFilter] = useState('all');
  const [bookmarkBranchFilter, setBookmarkBranchFilter] = useState('all');
  const [bookmarkCategories, setBookmarkCategories] = useState([]);
  const [bookmarkBranches, setBookmarkBranches] = useState([]);
  
  // Achievements states
  const [achievements, setAchievements] = useState([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  
  // Learning Goals states
  const [learningGoals, setLearningGoals] = useState([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', target_date: '' });
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState({ totalDownloads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'bookmarks' && bookmarks.length === 0) {
      fetchBookmarks();
    } else if (activeTab === 'achievements' && achievements.length === 0) {
      fetchAchievements();
    } else if (activeTab === 'goals' && learningGoals.length === 0) {
      fetchLearningGoals();
    }
  }, [activeTab]);

  // Filter bookmarks based on selected filters
  useEffect(() => {
    let filtered = [...bookmarks];

    if (bookmarkTypeFilter !== 'all') {
      filtered = filtered.filter(bookmark => bookmark.resource_type === bookmarkTypeFilter);
    }

    if (bookmarkCategoryFilter !== 'all') {
      filtered = filtered.filter(bookmark => bookmark.category === bookmarkCategoryFilter);
    }

    if (bookmarkBranchFilter !== 'all') {
      filtered = filtered.filter(bookmark => bookmark.branch === bookmarkBranchFilter);
    }

    setFilteredBookmarks(filtered);
  }, [bookmarks, bookmarkTypeFilter, bookmarkCategoryFilter, bookmarkBranchFilter]);

  // Extract unique categories and branches when bookmarks change
  useEffect(() => {
    if (bookmarks.length > 0) {
      const categories = [...new Set(bookmarks.map(b => b.category))].sort();
      const branches = [...new Set(bookmarks.map(b => b.branch))].sort();
      setBookmarkCategories(categories);
      setBookmarkBranches(branches);
    }
  }, [bookmarks]);

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await statsAPI.get();
      setStats(statsResponse.data);
      
      // Get real user stats from backend
      const userStatsResponse = await profileAPI.getStats();
      setUserStats(userStatsResponse.data);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
const fetchBookmarks = async () => {
  setIsLoadingBookmarks(true);
  try {
    const response = await bookmarksAPI.getAll();
    // Make sure response.data.data is an array before setting
    setBookmarks(Array.isArray(response.data.data) ? response.data.data : []);
  } catch (error) {
    toast({ title: "Error", description: "Failed to load bookmarks", variant: "destructive" });
  } finally {
    setIsLoadingBookmarks(false);
  }
};


  const fetchAchievements = async () => {
    setIsLoadingAchievements(true);
    try {
      const response = await achievementsAPI.getAll();
      setAchievements(response.data);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to load achievements",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAchievements(false);
    }
  };

  const fetchLearningGoals = async () => {
    setIsLoadingGoals(true);
    try {
      const response = await learningGoalsAPI.getAll();
      setLearningGoals(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load learning goals", 
        variant: "destructive"
      });
    } finally {
      setIsLoadingGoals(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    
    try {
      await profileAPI.update(profileForm);
      updateUser({ ...currentUser, name: profileForm.name });
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const response = await profileAPI.uploadPhoto(file);

    // If backend returns the updated "profile"
    if (response.data && response.data.profile) {
      updateUser(response.data.profile);
    } else {
      // Fallback: fetch fresh profile from API if the "profile" key is missing
      const freshProfile = await profileAPI.get();
      updateUser(freshProfile.data.data);
    }

    toast({
      title: "Success",
      description: "Profile photo updated successfully! Check the navbar to see your new photo.",
    });
    // No page reload required
  } catch (error) {
    toast({
      title: "Error", 
      description: "Failed to upload photo",
      variant: "destructive"
    });
  }
};


  const handlePhotoRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      await profileAPI.removePhoto();
      
      // Update user context to remove photo
      const updatedUser = {
        ...currentUser,
        profile_photo: null
      };
      updateUser(updatedUser);
      
      toast({
        title: "Success",
        description: "Profile photo removed successfully!"
      });
      
      // Reload page to refresh all components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to remove photo",
        variant: "destructive"
      });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    // Validation checks
    if (!passwordForm.current_password) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive"
      });
      return;
    }

    if (!passwordForm.new_password) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive"
      });
      return;
    }

    try {
      await profileAPI.updatePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast({
        title: "Success", 
        description: "Password updated successfully! You can now use your new password to login."
      });
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to update password";
      toast({
        title: "Password Update Failed",
        description: errorMessage === "Current password is incorrect" 
          ? "The current password you entered is incorrect. Please try again."
          : errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleRemoveBookmark = async (resourceType, resourceId) => {
    try {
      await bookmarksAPI.remove(resourceType, resourceId);
      setBookmarks(bookmarks.filter(b => !(b.resource_type === resourceType && b.resource_id === resourceId)));
      toast({
        title: "Success",
        description: "Bookmark removed"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to remove bookmark",
        variant: "destructive"
      });
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    
    try {
      await learningGoalsAPI.create({
        ...goalForm,
        target_date: new Date(goalForm.target_date).toISOString()
      });
      setGoalForm({ title: '', description: '', target_date: '' });
      setIsGoalDialogOpen(false);
      fetchLearningGoals();
      toast({
        title: "Success",
        description: "Learning goal created successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive"
      });
    }
  };

  const handleUpdateGoalProgress = async (goalId, progress) => {
    try {
      await learningGoalsAPI.update(goalId, { progress });
      fetchLearningGoals();
      if (progress === 100) {
        toast({
          title: "Congratulations! 🎉",
          description: "Goal completed!"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await learningGoalsAPI.delete(goalId);
      fetchLearningGoals();
      toast({
        title: "Success",
        description: "Goal deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      });
    }
  };

  const handleQuickView = (bookmark) => {
    const resourceId = bookmark.resource_id;
    let viewAPI;
    
    switch (bookmark.resource_type) {
      case 'paper':
        viewAPI = papersAPI;
        break;
      case 'note':
        viewAPI = notesAPI;
        break;
      case 'syllabus':
        viewAPI = syllabusAPI;
        break;
      default:
        return;
    }

    viewAPI.view(resourceId);
    toast({
      title: "Opening Preview",
      description: `Opening: ${bookmark.title}`
    });
  };

  const handleQuickDownload = (bookmark) => {
    const resourceId = bookmark.resource_id;
    let downloadAPI;
    
    switch (bookmark.resource_type) {
      case 'paper':
        downloadAPI = papersAPI;
        break;
      case 'note':
        downloadAPI = notesAPI;
        break;
      case 'syllabus':
        downloadAPI = syllabusAPI;
        break;
      default:
        return;
    }

    downloadAPI.download(resourceId);
    toast({
      title: "Download Started",
      description: `Downloading: ${bookmark.title}`
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20" data-testid="profile-avatar">
                <AvatarImage 
                   src={currentUser?.profilephoto ? `${API_BASE_URL}${currentUser.profilephoto}` : undefined} 
                  alt={currentUser?.name} 
                />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {currentUser?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {getGreeting()}, {currentUser?.name}!
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Welcome to your learning dashboard
              </p>
              {isAdmin && (
                <Badge variant="destructive" className="mt-2">
                  <Award className="h-3 w-3 mr-1" />
                  Administrator
                </Badge>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Dashboard Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4" data-testid="profile-tabs">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Bookmarks
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals & Achievements
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700" data-testid="downloads-stat-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-white">Total Downloads</CardTitle>
                  <Download className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{userStats.totalDownloads}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Across all resources</p>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-white">Bookmarks</CardTitle>
                  <Heart className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{bookmarks.length}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Saved resources</p>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-white">Achievements</CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{achievements.length}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Badges earned</p>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-white">Learning Goals</CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{learningGoals.filter(g => g.completed).length}/{learningGoals.length}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Goals completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Platform Stats */}
            {stats && (
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <GraduationCap className="h-5 w-5" />
                    Platform Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_papers}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Papers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total_notes}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Notes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total_syllabus}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Syllabus</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.total_users}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Settings */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                     <AvatarImage 
                          src={photoUrl}
                          alt={currentUser?.name}
                    />

                      <AvatarFallback className="bg-blue-600 text-white text-xl">
                        {currentUser?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => document.getElementById('photo-upload').click()}
                        data-testid="upload-photo-btn"
                      >
                        <Camera className="h-4 w-4" />
                        {currentUser?.profile_photo ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      {currentUser?.profile_photo && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" 
                          onClick={handlePhotoRemove}
                          data-testid="remove-photo-btn"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Photo
                        </Button>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="dark:text-white">Name</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        data-testid="profile-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="dark:text-white">Email</Label>
                      <Input
                        id="email"
                        value={currentUser?.email}
                        disabled
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      />
                    </div>
                    <Button type="submit" disabled={isUpdatingProfile} data-testid="update-profile-btn">
                      {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Password Settings */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAdmin && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Admin Account:</strong> If you&apos;re using the default admin credentials, your current password is: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">admin123</code>
                      </p>
                    </div>
                  )}
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="current-password" className="dark:text-white">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter your current password"
                        data-testid="current-password-input"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password" className="dark:text-white">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter new password (min 6 characters)"
                        data-testid="new-password-input"
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="dark:text-white">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Re-enter new password"
                        data-testid="confirm-password-input"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" data-testid="update-password-btn">
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="space-y-6">
            {/* Bookmark Filters */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Resource Type Filter */}
                  <div>
                    <Label className="dark:text-white">Filter by Type</Label>
                    <Select 
                      value={bookmarkTypeFilter} 
                      onValueChange={setBookmarkTypeFilter}
                    >
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-600">All Types</SelectItem>
                        <SelectItem value="paper" className="dark:text-white dark:hover:bg-gray-600">Papers</SelectItem>
                        <SelectItem value="note" className="dark:text-white dark:hover:bg-gray-600">Notes</SelectItem>
                        <SelectItem value="syllabus" className="dark:text-white dark:hover:bg-gray-600">Syllabus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <Label className="dark:text-white">Filter by Category</Label>
                    <Select 
                      value={bookmarkCategoryFilter} 
                      onValueChange={setBookmarkCategoryFilter}
                    >
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-600">All Categories</SelectItem>
                        {bookmarkCategories.map(category => (
                          <SelectItem key={category} value={category} className="dark:text-white dark:hover:bg-gray-600">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Filter */}
                  <div>
                    <Label className="dark:text-white">Filter by Branch</Label>
                    <Select 
                      value={bookmarkBranchFilter} 
                      onValueChange={setBookmarkBranchFilter}
                    >
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-600">All Branches</SelectItem>
                        {bookmarkBranches.map(branch => (
                          <SelectItem key={branch} value={branch} className="dark:text-white dark:hover:bg-gray-600">
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bookmarks Grid */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between dark:text-white">
                  <span className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    My Bookmarks ({filteredBookmarks.length})
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>{filteredBookmarks.filter(b => b.resource_type === 'paper').length} Papers</span>
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span>{filteredBookmarks.filter(b => b.resource_type === 'note').length} Notes</span>
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                    <span>{filteredBookmarks.filter(b => b.resource_type === 'syllabus').length} Syllabus</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBookmarks ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : filteredBookmarks.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {bookmarks.length === 0 ? "No bookmarks yet" : "No bookmarks match your filters"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {bookmarks.length === 0 
                        ? "Start exploring and bookmark your favorite resources!" 
                        : "Try adjusting your filter criteria"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(filteredBookmarks || []).map((bookmark) => (
                      <Card key={bookmark.id} className="hover:shadow-md transition-all duration-300 hover:-translate-y-1 dark:bg-gray-700 dark:border-gray-600" data-testid="bookmark-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {bookmark.resource_type === 'paper' && <FileText className="h-4 w-4 text-blue-600" />}
                              {bookmark.resource_type === 'note' && <BookOpen className="h-4 w-4 text-green-600" />}
                              {bookmark.resource_type === 'syllabus' && <GraduationCap className="h-4 w-4 text-purple-600" />}
                              <Badge variant="outline" className="text-xs capitalize">
                                {bookmark.resource_type}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveBookmark(bookmark.resource_type, bookmark.resource_id)}
                              className="text-red-600 hover:text-red-700 p-1 h-auto"
                              data-testid="remove-bookmark-btn"
                            >
                              <Heart className="h-4 w-4 fill-current" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium dark:text-white line-clamp-2 leading-snug">{bookmark.title}</h4>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{bookmark.branch}</span>
                              <Badge variant="secondary" className="text-xs">
                                {bookmark.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Saved {new Date(bookmark.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickView(bookmark)}
                              className="flex-1 text-xs"
                              data-testid="quick-view-bookmark-btn"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickDownload(bookmark)}
                              className="flex-1 text-xs"
                              data-testid="quick-download-bookmark-btn"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals & Achievements Tab */}
          <TabsContent value="goals" className="space-y-6">
            {/* Achievements Section */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between dark:text-white">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Achievements ({achievements.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Progress: {achievements.length}/12 badges
                    </div>
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (achievements.length / 12) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAchievements ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : achievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No achievements yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Complete activities to earn your first badge!</p>
                    
                    {/* Achievement Hints */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2">🎯 Getting Started</h5>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                          <li>• Bookmark your first resource</li>
                          <li>• Set a learning goal</li>
                          <li>• Upload a profile photo</li>
                        </ul>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <h5 className="font-medium text-green-900 dark:text-green-300 mb-2">📚 Learning Path</h5>
                        <ul className="text-xs text-green-700 dark:text-green-400 space-y-1">
                          <li>• Download 10+ resources</li>
                          <li>• Complete learning goals</li>
                          <li>• Contribute to the platform</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {achievements.map((achievement) => (
                        <Card key={achievement.id} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800" data-testid="achievement-card">
                          {/* Achievement Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-orange-400/20 animate-pulse"></div>
                          
                          <CardContent className="relative p-4 text-center">
                            <div className="text-4xl mb-3 filter drop-shadow-lg">{achievement.icon}</div>
                            <h4 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">{achievement.name}</h4>
                            <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">{achievement.description}</p>
                            <Badge variant="secondary" className="text-xs bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300">
                              Earned {new Date(achievement.earned_at).toLocaleDateString()}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Achievement Milestones */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h5 className="font-medium text-yellow-900 dark:text-yellow-300 mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Next Achievements to Unlock
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {achievements.length < 5 && (
                          <div className="text-yellow-700 dark:text-yellow-400">
                            📚 Bookmark Collector - Save 10+ resources
                          </div>
                        )}
                        {achievements.length < 8 && (
                          <div className="text-yellow-700 dark:text-yellow-400">
                            ⚡ Power User - Download 50+ resources
                          </div>
                        )}
                        {achievements.length < 10 && (
                          <div className="text-yellow-700 dark:text-yellow-400">
                            👑 Goal Master - Complete 5+ goals
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Goals Section */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Target className="h-5 w-5" />
                    Learning Goals ({learningGoals.length})
                  </CardTitle>
                  <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2" data-testid="add-goal-btn">
                        <Plus className="h-4 w-4" />
                        Add Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="dark:text-white">Create Learning Goal</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateGoal} className="space-y-4">
                        <div>
                          <Label htmlFor="goal-title" className="dark:text-white">Goal Title</Label>
                          <Input
                            id="goal-title"
                            value={goalForm.title}
                            onChange={(e) => setGoalForm({...goalForm, title: e.target.value})}
                            placeholder="e.g., Master Data Structures"
                            required
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            data-testid="goal-title-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="goal-description" className="dark:text-white">Description</Label>
                          <Textarea
                            id="goal-description"
                            value={goalForm.description}
                            onChange={(e) => setGoalForm({...goalForm, description: e.target.value})}
                            placeholder="Describe your learning goal..."
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            data-testid="goal-description-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="goal-date" className="dark:text-white">Target Date</Label>
                          <Input
                            id="goal-date"
                            type="date"
                            value={goalForm.target_date}
                            onChange={(e) => setGoalForm({...goalForm, target_date: e.target.value})}
                            required
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            data-testid="goal-date-input"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1" data-testid="create-goal-btn">
                            Create Goal
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsGoalDialogOpen(false)}
                            className="dark:border-gray-600 dark:text-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingGoals ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : learningGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No learning goals yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Set your first goal to start tracking progress!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {learningGoals.map((goal) => (
                      <Card key={goal.id} className={`p-4 dark:border-gray-600 transition-all duration-300 hover:shadow-lg ${
                        goal.completed 
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
                          : 'dark:bg-gray-700 hover:-translate-y-1'
                      }`} data-testid="learning-goal-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`font-medium ${goal.completed ? 'text-green-900 dark:text-green-300' : 'dark:text-white'}`}>
                                {goal.title}
                              </h4>
                              {goal.completed && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <Badge variant="secondary" className="bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs">
                                    Completed! 🎉
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <p className={`text-sm mt-1 ${
                              goal.completed 
                                ? 'text-green-800 dark:text-green-400' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {goal.description}
                            </p>
                            
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className={goal.completed ? 'text-green-700 dark:text-green-300' : 'dark:text-gray-300'}>
                                  Progress
                                </span>
                                <span className={`font-medium ${
                                  goal.completed 
                                    ? 'text-green-700 dark:text-green-300' 
                                    : goal.progress >= 75 
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'dark:text-gray-300'
                                }`}>
                                  {goal.progress}%
                                </span>
                              </div>
                              <Progress 
                                value={goal.progress} 
                                className={`h-3 ${
                                  goal.completed 
                                    ? '[&>div]:bg-green-600' 
                                    : goal.progress >= 75 
                                      ? '[&>div]:bg-blue-600' 
                                      : ''
                                }`} 
                              />
                              
                              {/* Progress milestones */}
                              {!goal.completed && (
                                <div className="flex items-center justify-between mt-2 text-xs">
                                  <span className={`${goal.progress >= 25 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                    25%
                                  </span>
                                  <span className={`${goal.progress >= 50 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                    50%
                                  </span>
                                  <span className={`${goal.progress >= 75 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                    75%
                                  </span>
                                  <span className={`${goal.progress >= 100 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                    100%
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Target: {new Date(goal.target_date).toLocaleDateString()}
                              </p>
                              
                              {/* Days remaining indicator */}
                              {!goal.completed && (
                                <Badge variant="outline" className="text-xs">
                                  {(() => {
                                    const daysLeft = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
                                    return daysLeft > 0 ? `${daysLeft} days left` : 'Overdue';
                                  })()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            {!goal.completed && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateGoalProgress(goal.id, Math.min(100, goal.progress + 25))}
                                  className="text-xs"
                                  data-testid="update-progress-btn"
                                >
                                  +25%
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                                  className="text-xs"
                                  data-testid="update-progress-small-btn"
                                >
                                  +10%
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid="delete-goal-btn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileDashboard;