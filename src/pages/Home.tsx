import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, PlusCircle, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveLoans = async () => {
      if (!currentUser) return;
      try {
        // Fetch where user is borrower (active) or owner (pending)
        // Since we can't easily do OR queries across different fields in one go without complex indexes,
        // we'll fetch both and combine.
        const borrowerQ = query(collection(db, 'transactions'), where('borrower_id', '==', currentUser.uid));
        const ownerQ = query(collection(db, 'transactions'), where('owner_id', '==', currentUser.uid));
        
        const [borrowerSnap, ownerSnap] = await Promise.all([getDocs(borrowerQ), getDocs(ownerQ)]);
        
        const allTx: any[] = [];
        
        borrowerSnap.forEach(d => {
          const data = d.data();
          if (data.status === 'active' || data.status === 'pending') {
            allTx.push({ id: d.id, role: 'borrower', ...data });
          }
        });
        
        ownerSnap.forEach(d => {
          const data = d.data();
          if (data.status === 'pending' || data.status === 'active') {
            allTx.push({ id: d.id, role: 'owner', ...data });
          }
        });

        // Fetch item details for these transactions
        for (let tx of allTx) {
          const itemDoc = await getDocs(query(collection(db, 'items'), where('__name__', '==', tx.item_id)));
          if (!itemDoc.empty) {
            tx.item = { id: itemDoc.docs[0].id, ...itemDoc.docs[0].data() };
          }
        }

        setActiveLoans(allTx);
      } catch (error) {
        console.error("Error fetching loans for home:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveLoans();
  }, [currentUser]);

  const hasUnread = (tx: any) => {
    if (!tx.last_message_at) return false;
    const readField = tx.role === 'owner' ? tx.last_read_owner : tx.last_read_borrower;
    if (!readField) return true;
    return tx.last_message_at.toMillis() > readField.toMillis();
  };

  return (
    <div className="flex flex-col space-y-6 pt-4 pb-8">
      {/* Active Widgets */}
      {!loading && activeLoans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 text-lg">Action Required</h2>
          {activeLoans.map(tx => (
            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {tx.role === 'owner' 
                    ? (tx.status === 'pending' ? `Request for ${tx.item?.title || 'Item'}` : `Lending ${tx.item?.title || 'Item'}`)
                    : `Borrowing ${tx.item?.title || 'Item'}`}
                </p>
                <p className="text-xs text-orange-600 font-medium capitalize">{tx.status}</p>
              </div>
              <div className="flex space-x-2 shrink-0">
                <button 
                  onClick={() => navigate(`/chat/${tx.id}`)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 relative"
                >
                  <MessageCircle size={18} />
                  {hasUnread(tx) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </button>
                <Link 
                  to={`/dashboard?tab=${tx.role === 'owner' ? 'lending' : 'borrowing'}`}
                  className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-primary rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Need a tool?</h2>
          <p className="text-primary-100 mb-6 text-sm">Borrow from your neighbors instead of buying.</p>
          <Link to="/catalog" className="inline-flex items-center bg-white text-primary font-semibold py-2 px-4 rounded-full text-sm">
            <Search size={16} className="mr-2" />
            Browse Catalog
          </Link>
        </div>
        {/* Abstract shape */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/catalog" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-3 rounded-full mb-3 text-blue-600">
            <Search size={24} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Borrow</span>
        </Link>
        <Link to="/add-item" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-green-50 p-3 rounded-full mb-3 text-green-600">
            <PlusCircle size={24} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Lend</span>
        </Link>
      </div>

      {/* Trust Badge */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start">
        <ShieldCheck className="text-primary shrink-0 mr-3 mt-1" size={24} />
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Verified Neighborhood</h4>
          <p className="text-xs text-gray-600 mt-1">
            Everyone here has been verified with the Tranholmen invite code. Trust your neighbors!
          </p>
        </div>
      </div>
    </div>
  );
};
