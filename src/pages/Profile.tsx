import { useAuth } from '../contexts/AuthContext';
import { LogOut, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!userProfile) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="pb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-primary h-24"></div>
        <div className="px-5 pb-5">
          <div className="relative flex justify-between items-end -mt-10 mb-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-primary border-4 border-white shadow-sm">
              {userProfile.first_name[0]}{userProfile.last_name[0]}
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900">{userProfile.first_name} {userProfile.last_name}</h2>
          
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <MapPin size={16} className="mr-1 text-gray-400" />
            {userProfile.street_address}
          </div>
          
          <div className="flex items-center mt-2 text-sm font-medium text-yellow-600 bg-yellow-50 w-fit px-2 py-1 rounded">
            <Star size={14} className="mr-1 fill-current" />
            {userProfile.trust_score.toFixed(1)} Trust Score
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Account Settings</h3>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-between p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <span className="font-medium">Sign Out</span>
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
