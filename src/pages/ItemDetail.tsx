import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailNotification } from '../lib/notifications';
import { MapPin, ArrowLeft, Info } from 'lucide-react';

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
      
      // Fetch owner details to send email notification
      try {
        const ownerDoc = await getDoc(doc(db, 'users', item.owner_id));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          await sendEmailNotification(
            ownerData.email,
            ownerData.first_name,
            `New borrow request for your ${item.title}!`,
            `
              <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                <h2>Hi ${ownerData.first_name},</h2>
                <p><strong>${userProfile?.first_name} ${userProfile?.last_name}</strong> has requested to borrow your <strong>${item.title}</strong>.</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                  <strong>Their project:</strong><br/>
                  ${projectDescription}
                </p>
                <p>Log in to the Tranholmen Tool Library to approve the request and arrange a pickup.</p>
                <br/>
                <a href="${window.location.origin}/dashboard" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Request</a>
              </div>
            `
          );
        }
      } catch (emailErr) {
        console.error("Failed to send notification email:", emailErr);
      }

      setShowModal(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative">
            <form onSubmit={handleRequest} className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Request to Borrow</h3>
              
              <div className="bg-blue-50 p-3 rounded-md flex items-start mb-4">
                <Info className="text-blue-500 mt-0.5 mr-2 shrink-0" size={16} />
                <p className="text-xs text-blue-700">
                  Most neighbors respond within a few hours. The owner's exact address will be shared with you if they approve.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What's your project?</label>
                  <textarea
                    required
                    rows={3}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
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
              
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!agreed || !projectDescription || requesting}
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white border border-transparent rounded-md shadow-sm hover:bg-primary-hover font-medium text-sm disabled:opacity-50"
                >
                  {requesting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
