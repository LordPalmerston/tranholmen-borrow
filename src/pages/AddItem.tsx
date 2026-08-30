import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Plus, ArrowLeft } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export const AddItem = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Gardening');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const categories = ['Gardening', 'Power Tools', 'Painting', 'Cleaning', 'Other'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !title || !description) return;
    
    setUploading(true);
    try {
      let photoUrl = '';
      
      // Upload to Cloudinary if image exists
      if (file) {
        // Compress photo before uploading
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error?.message || 'Failed to upload image');
        }
        const uploadData = await response.json();
        photoUrl = uploadData.secure_url;
      }

      // Add to Firestore
      await addDoc(collection(db, 'items'), {
        title,
        description,
        category,
        imageUrl: photoUrl,
        owner_id: currentUser.uid,
        owner_first_name: userProfile.first_name,
        status: 'available',
        created_at: serverTimestamp()
      });

      navigate('/catalog');
    } catch (error: any) {
      console.error("Error adding item:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4 bg-white p-2 rounded-full shadow-sm w-fit">
        <ArrowLeft size={20} />
        <span className="ml-1 text-sm font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">List a Tool</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Tap to add photo</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-2 text-xs"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bosch Power Drill"
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition, included accessories, etc."
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !title || !description}
          className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center"
        >
          {uploading ? 'Adding...' : (
            <>
              <Plus size={20} className="mr-2" /> List Item
            </>
          )}
        </button>
      </form>
    </div>
  );
};
