import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Camera, Upload, Star, CheckCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export const ReturnFlow = () => {
  const { id } = useParams(); // Transaction ID
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rating, setRating] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleReturn = async () => {
    if (!file || !id) return;
    setUploading(true);
    
    try {
      // 1. Compress photo
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Upload photo to Cloudinary
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to upload image to Cloudinary');
      }

      const uploadData = await response.json();
      const photoUrl = uploadData.secure_url;

      // 2. Get transaction to update item status too
      const txDoc = await getDoc(doc(db, 'transactions', id));
      if (txDoc.exists()) {
        const itemId = txDoc.data().item_id;
        
        // 3. Mark transaction as completed and save return details
        await updateDoc(doc(db, 'transactions', id), {
          status: 'completed',
          return_photo_url: uploadData.secure_url,
          rating: rating,
          returned_at: new Date()
        });
        
        // Update item back to available
        await updateDoc(doc(db, 'items', itemId), {
          status: 'available'
        });
        
        setCompleted(true);
      }
    } catch (error: any) {
      console.error("Error processing return:", error);
      alert(`Upload failed: ${error.message || 'Please check your Cloudinary configuration.'}`);
    } finally {
      setUploading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Item Returned!</h2>
        <p className="text-gray-600 mb-8">Thank you for being a great neighbor. Your photo has been shared with the owner.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-sm"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Return Item</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="font-semibold mb-2">1. Snap a Photo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Take a quick photo of the item back on the owner's porch to verify its return condition.
        </p>

        {!preview ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Camera className="w-10 h-10 text-gray-400 mb-3" />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Tap to open camera</span></p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-2 text-xs"
            >
              Retake
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="font-semibold mb-2">2. Rate your experience</h3>
        <p className="text-sm text-gray-600 mb-4">
          How was your experience borrowing from your neighbor?
        </p>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}>
              <Star 
                size={32} 
                className={rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
              />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleReturn}
        disabled={!file || rating === 0 || uploading}
        className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-bold py-4 px-4 rounded-xl shadow-sm transition-colors flex justify-center items-center"
      >
        {uploading ? 'Processing...' : (
          <>
            <Upload size={20} className="mr-2" />
            Complete Return
          </>
        )}
      </button>
    </div>
  );
};
