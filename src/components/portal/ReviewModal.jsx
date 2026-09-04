import { useState, useEffect } from 'react';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { reviewService } from '../../api/reviewService';

export default function ReviewModal({ isOpen, onClose, onReviewSubmitted }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const res = await reviewService.getReviewableUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !rating || !reviewText.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await reviewService.createReview({
        revieweeId: selectedUser,
        rating,
        reviewText
      });
      setIsSubmitting(false);
      
      // Reset form
      setSelectedUser('');
      setRating(0);
      setReviewText('');
      
      onReviewSubmitted();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Write a Review</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-lg">
              {error}
            </div>
          )}
          
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-2">Select User to Review</label>
            <select 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold focus:border-[var(--saathi-primary)] focus:ring-1 focus:ring-[var(--saathi-primary)] outline-none"
            >
              <option value="">-- Select User --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-2">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  {(hoverRating >= star || rating >= star) ? (
                    <StarIcon className="w-8 h-8 text-amber-400" />
                  ) : (
                    <StarOutline className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Review Text</label>
            <textarea 
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows="4"
              placeholder="Describe your experience..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium focus:border-[var(--saathi-primary)] focus:ring-1 focus:ring-[var(--saathi-primary)] outline-none resize-none"
            ></textarea>
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-dark)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
