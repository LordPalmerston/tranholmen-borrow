import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Check, MapPin, Camera, Clock, MessageCircle, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'lending' ? 'lending' : 'borrowing';
  
  const [activeTab, setActiveTab] = useState<'borrowing' | 'lending'>(initialTab);
  
  useEffect(() => {
    const currentTab = searchParams.get('tab') === 'lending' ? 'lending' : 'borrowing';
    if (activeTab !== currentTab) {
      setActiveTab(currentTab);
    }
  }, [location.search]);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerAddresses, setOwnerAddresses] = useState<Record<string, string>>({});

  const fetchTransactions = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const field = activeTab === 'borrowing' ? 'borrower_id' : 'owner_id';
      const q = query(collection(db, 'transactions'), where(field, '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const fetched: any[] = [];
      const ownersToFetch = new Set<string>();
      
      querySnapshot.forEach((d) => {
        const data = d.data();
        // Hide if the current user soft-deleted it
        if (activeTab === 'lending' && data.hidden_by_owner) return;
        if (activeTab === 'borrowing' && data.hidden_by_borrower) return;
        
        fetched.push({ id: d.id, ...data });
        if (activeTab === 'borrowing' && (data.status === 'approved' || data.status === 'active')) {
          ownersToFetch.add(data.owner_id);
        }
      });
      
      // Fetch owner addresses for approved/active borrows
      const addresses: Record<string, string> = {};
      for (const ownerId of Array.from(ownersToFetch)) {
        if (!ownerAddresses[ownerId]) {
          const ownerDoc = await getDoc(doc(db, 'users', ownerId));
          if (ownerDoc.exists()) {
            addresses[ownerId] = ownerDoc.data().street_address;
          }
        }
      }
      
      setOwnerAddresses(prev => ({...prev, ...addresses}));
      
      // Sort by created_at desc (in memory for MVP to avoid index requirements)
      fetched.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
      setTransactions(fetched);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, currentUser]);

  const hasUnread = (tx: any) => {
    if (!tx.last_message_at) return false;
    const readField = activeTab === 'lending' ? tx.last_read_owner : tx.last_read_borrower;
    if (!readField) return true;
    return tx.last_message_at.toMillis() > readField.toMillis();
  };

  const formatDate = (ts: any) => {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleApprove = async (transactionId: string, itemId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'approved',
        start_time: new Date()
      });
      await updateDoc(doc(db, 'items', itemId), {
        status: 'active'
      });
      fetchTransactions();
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const handleStartBorrow = async (transactionId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'active',
        picked_up_at: new Date(),
        // Assuming a standard 2-day borrow period for MVP
        expected_end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      });
      fetchTransactions();
    } catch (error) {
      console.error("Error starting borrow:", error);
    }
  };

  const handleDeleteTransaction = async (tx: any) => {
    if (tx.status === 'active') {
      alert("You cannot delete an active loan. The item must be returned first.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this transaction from your dashboard?")) return;
    
    try {
      if (tx.status === 'completed') {
        // Soft delete: hide it from the user's dashboard history but keep the log
        const isOwner = currentUser?.uid === tx.owner_id;
        if (isOwner) {
          await updateDoc(doc(db, 'transactions', tx.id), { hidden_by_owner: true });
        } else {
          await updateDoc(doc(db, 'transactions', tx.id), { hidden_by_borrower: true });
        }
      } else {
        // Cancel the ongoing transaction (keeps the record in the database with status 'cancelled')
        // We hide it for the person who cancelled it, so it disappears from their dashboard.
        const isOwner = currentUser?.uid === tx.owner_id;
        await updateDoc(doc(db, 'transactions', tx.id), { 
          status: 'cancelled',
          hidden_by_owner: isOwner ? true : false,
          hidden_by_borrower: !isOwner ? true : false
        });
        
        // Reset item to available
        await updateDoc(doc(db, 'items', tx.item_id), { status: 'available' });
      }
      
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to remove the transaction.");
    }
  };

  return (
    <div className="pb-8">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 sticky top-[60px] bg-gray-50 z-10 pt-2">
            <button
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'borrowing' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => navigate('/dashboard?tab=borrowing')}
            >
              Borrowing
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'lending' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => navigate('/dashboard?tab=lending')}
            >
              Lending
            </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No {activeTab} transactions found.
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => (
            <div key={tx.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{tx.item_title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    tx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    tx.status === 'active' ? 'bg-green-100 text-green-800' :
                    tx.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tx.status}
                  </span>
                  {tx.status !== 'active' && (
                    <button 
                      onClick={() => handleDeleteTransaction(tx)} 
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      aria-label="Remove transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                <span className="font-medium text-gray-900">Project:</span> {tx.project_description}
              </p>

              <div className="bg-gray-50 rounded-md p-3 mb-4 text-xs text-gray-600 space-y-1">
                {tx.created_at && <div className="flex justify-between"><span>Requested:</span> <span className="font-medium text-gray-900">{formatDate(tx.created_at)}</span></div>}
                {tx.start_time && <div className="flex justify-between"><span>Approved:</span> <span className="font-medium text-gray-900">{formatDate(tx.start_time)}</span></div>}
                {tx.picked_up_at && <div className="flex justify-between"><span>Picked Up:</span> <span className="font-medium text-gray-900">{formatDate(tx.picked_up_at)}</span></div>}
                {tx.returned_at && <div className="flex justify-between"><span>Returned:</span> <span className="font-medium text-gray-900">{formatDate(tx.returned_at)}</span></div>}
              </div>

              {tx.return_photo_url && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Return Condition</span>
                  <img src={tx.return_photo_url} alt="Return Condition" className="w-full h-48 object-cover rounded-md border border-gray-200" />
                </div>
              )}

              {/* LENDING VIEW */}
              {activeTab === 'lending' && tx.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/chat/${tx.id}`)}
                    className="relative flex items-center justify-center w-full bg-blue-50 text-blue-700 py-2 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
                  >
                    <MessageCircle size={16} className="mr-1" /> Message
                    {hasUnread(tx) && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                  </button>
                  <button 
                    onClick={() => handleApprove(tx.id, tx.item_id)}
                    className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium flex justify-center items-center"
                  >
                    <Check size={16} className="mr-1" /> Approve
                  </button>
                </div>
              )}

              {activeTab === 'lending' && (tx.status === 'approved' || tx.status === 'active') && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center text-orange-600 mb-3 bg-orange-50 p-2 rounded">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm font-medium">
                      {tx.status === 'approved' ? 'Waiting for pickup' : 'Currently loaned out'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/chat/${tx.id}`)}
                      className="relative flex items-center justify-center w-full bg-blue-50 text-blue-700 py-2 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
                    >
                      <MessageCircle size={16} className="mr-1" /> Message
                      {hasUnread(tx) && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* BORROWING VIEW */}
              {activeTab === 'borrowing' && tx.status === 'approved' && (
                <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="flex items-start">
                    <MapPin size={16} className="text-primary mt-0.5 mr-2 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Pickup Address Revealed</p>
                      <p className="text-sm text-gray-900">{ownerAddresses[tx.owner_id] || 'Loading address...'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/chat/${tx.id}`)}
                      className="flex items-center justify-center w-full bg-blue-50 text-blue-700 py-2 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
                    >
                      <MessageCircle size={16} className="mr-1" /> Message
                    </button>
                    <button 
                      onClick={() => handleStartBorrow(tx.id)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium"
                    >
                      I Picked It Up
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'borrowing' && tx.status === 'active' && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center text-orange-600 mb-3 bg-orange-50 p-2 rounded">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm font-medium">Active Loan</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/chat/${tx.id}`)}
                      className="flex items-center justify-center w-full bg-blue-50 text-blue-700 py-2 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
                    >
                      <MessageCircle size={16} className="mr-1" /> Message
                    </button>
                    <button 
                      onClick={() => navigate(`/return/${tx.id}`)}
                      className="flex items-center justify-center w-full bg-primary text-white py-2 rounded-md font-medium text-sm hover:bg-primary-hover transition-colors"
                    >
                      <Camera size={16} className="mr-1" /> Return Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
