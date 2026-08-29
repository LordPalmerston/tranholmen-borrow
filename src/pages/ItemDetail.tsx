import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, ShieldCheck, ArrowLeft, Info } from 'lucide-react';

export const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'items', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setItem({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching item:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !currentUser) return;
    
    setRequesting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        item_id: item.id,
        item_title: item.title,
        owner_id: item.owner_id,
        borrower_id: currentUser.uid,
        borrower_first_name: userProfile?.first_name,
        status: 'pending',
        project_description: projectDescription,
        created_at: serverTimestamp()
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating request:", error);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!item) return <div className="p-8 text-center">Item not found.</div>;

  return (
    <div className="pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4 bg-white p-2 rounded-full shadow-sm w-fit">
        <ArrowLeft size={20} />
        <span className="ml-1 text-sm font-medium">Back</span>
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="aspect-video bg-gray-200 relative">
           {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
           ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo Available</div>
           )}
        </div>
        
        <div className="p-5">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {item.status}
            </span>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <MapPin size={16} className="mr-1 text-primary" />
            <span>General Location: {item.general_location || 'Tranholmen'}</span>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">Description</h3>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{item.description}</p>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">Condition</h3>
            <p className="mt-1 text-sm text-gray-600">{item.condition || 'Used - Good'}</p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-[60px] left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-lg mx-auto">
          <button 
            onClick={() => setShowModal(true)}
            disabled={item.owner_id === currentUser?.uid || item.status !== 'available'}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors"
          >
            {item.owner_id === currentUser?.uid ? "This is your item" : "Request to Borrow"}
          </button>
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-t-xl sm:rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full sm:max-w-lg">
              <form onSubmit={handleRequest} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Request to Borrow</h3>
                    
                    <div className="bg-blue-50 p-3 rounded-md flex items-start mb-4">
                      <Info className="text-blue-500 mt-0.5 mr-2 shrink-0" size={16} />
                      <p className="text-xs text-blue-700">
                        Most neighbors respond within a few hours. The owner's exact address will be shared with you if they approve.
                      </p>
                    </div>

                    <div className="mt-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">What's your project?</label>
                        <textarea
                          required
                          rows={3}
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                          placeholder="E.g., I'm building a birdhouse and need a drill for the afternoon."
                        />
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="agree"
                            type="checkbox"
                            required
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="agree" className="font-medium text-gray-700">
                            I agree to return this clean and on time.
                          </label>
                          <p className="text-gray-500 text-xs mt-1">Our community relies on trust. Please treat this item as if it were your own.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={!agreed || !projectDescription || requesting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {requesting ? 'Sending...' : 'Send Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
