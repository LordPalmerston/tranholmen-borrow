import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, MapPin, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Profile = () => {
  const { currentUser, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [myTools, setMyTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  useEffect(() => {
    const fetchMyTools = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, 'items'), where('owner_id', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const tools: any[] = [];
        querySnapshot.forEach((d) => {
          tools.push({ id: d.id, ...d.data() });
        });
        setMyTools(tools);
      } catch (error) {
        console.error("Error fetching my tools:", error);
      } finally {
        setLoadingTools(false);
      }
    };
    fetchMyTools();
  }, [currentUser]);

  const handleDeleteTool = async (itemId: string) => {
    if (window.confirm('Are you sure you want to remove this tool?')) {
      try {
        await deleteDoc(doc(db, 'items', itemId));
        setMyTools(myTools.filter(tool => tool.id !== itemId));
      } catch (error) {
        console.error("Error deleting tool:", error);
        alert("Failed to delete tool. It might be tied to an active transaction.");
      }
    }
  };

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
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">My Tools</h3>
          <button 
            onClick={() => navigate('/add-item')}
            className="text-primary text-sm font-medium hover:text-primary-hover flex items-center bg-green-50 px-3 py-1.5 rounded-md"
          >
            + Add Tool
          </button>
        </div>
        
        {loadingTools ? (
          <div className="text-center py-4 text-sm text-gray-500">Loading tools...</div>
        ) : myTools.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">You haven't listed any tools yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTools.map(tool => (
              <div key={tool.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-3 shrink-0">
                  {tool.imageUrl ? (
                    <img src={tool.imageUrl} alt={tool.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Pic</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{tool.title}</p>
                  <p className="text-xs text-gray-500">{tool.status}</p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <button 
                    onClick={() => navigate(`/edit-item/${tool.id}`)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTool(tool.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
