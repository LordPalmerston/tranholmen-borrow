import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Send } from 'lucide-react';

export const Chat = () => {
  const { id } = useParams(); // Transaction ID
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [txDetails, setTxDetails] = useState<any>(null);
  const [otherUserName, setOtherUserName] = useState('Neighbor');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch transaction details to get context
  useEffect(() => {
    const fetchContext = async () => {
      if (!id || !currentUser) return;
      const txDoc = await getDoc(doc(db, 'transactions', id));
      if (txDoc.exists()) {
        const txData = txDoc.data();
        setTxDetails(txData);
        
        // Find out who the other person is
        const otherUserId = txData.borrower_id === currentUser.uid ? txData.owner_id : txData.borrower_id;
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        if (otherUserDoc.exists()) {
          setOtherUserName(otherUserDoc.data().first_name);
        }
      }
    };
    fetchContext();
  }, [id, currentUser]);

  // Listen to messages
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'transactions', id, 'messages'),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [id]);

  // Mark as read when messages change or chat is opened
  useEffect(() => {
    const markAsRead = async () => {
      if (!id || !currentUser || !txDetails) return;
      
      const isOwner = txDetails.owner_id === currentUser.uid;
      const field = isOwner ? 'last_read_owner' : 'last_read_borrower';
      
      try {
        await updateDoc(doc(db, 'transactions', id), {
          [field]: serverTimestamp()
        });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    };
    
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, id, currentUser, txDetails]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !currentUser) return;

    const msgText = newMessage.trim();
    setNewMessage(''); // clear input early for UX

    try {
      await addDoc(collection(db, 'transactions', id, 'messages'), {
        text: msgText,
        sender_id: currentUser.uid,
        created_at: serverTimestamp()
      });
      
      // Update the transaction to trigger unread indicators
      await updateDoc(doc(db, 'transactions', id), {
        last_message_at: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-4 pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center sticky top-0 z-10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 mr-3">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="font-bold text-gray-900">{otherUserName}</h2>
          {txDetails && (
            <p className="text-xs text-gray-500 truncate">Regarding your transaction</p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-100 shadow-sm rounded-tl-sm'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-2">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border-gray-300 rounded-full px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-primary text-white p-2.5 rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors flex shrink-0 items-center justify-center"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
