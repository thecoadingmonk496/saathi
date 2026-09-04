import { useState, useEffect } from 'react';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { reviewService } from '../api/reviewService';
import ReviewModal from '../components/portal/ReviewModal';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        setUserRole(userObj.role);
      }
    } catch (e) {}
    
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await reviewService.getAllReviews();
      if (res.success) {
        setReviews(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    fetchReviews(); // Refresh the list
  };

  return (
    <div className="w-full bg-[var(--saathi-background)] min-h-screen text-[var(--saathi-text)]">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex text-xs font-semibold text-[var(--saathi-text-secondary)]" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-[var(--saathi-focus)] transition-colors">Home</Link>
            </li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li>SAATHI</li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li className="text-[var(--saathi-text)]">Reviews</li>
          </ol>
        </nav>
      </div>

      {/* Page Header */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--saathi-primary)]">
            FARMER-BUYER REVIEWS
          </h1>
          <p className="mt-2 text-sm text-[var(--saathi-text-secondary)] font-semibold">
            Read community feedback and marketplace trust reviews.
          </p>
        </div>
        
        {isLoggedIn ? (
          (userRole === 'FARMER' || userRole === 'BUYER') ? (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 px-6 py-3 rounded-xl font-bold text-white bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-dark)] shadow-sm transition-colors"
            >
              Write a Review
            </button>
          ) : (
            <div className="shrink-0 px-6 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 shadow-sm text-center border border-gray-200 cursor-not-allowed" title="Only Farmers and Buyers can leave reviews">
              Only Farmers & Buyers can review
            </div>
          )
        ) : (
          <Link 
            to="/login"
            className="shrink-0 px-6 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-sm transition-colors text-center"
          >
            Log in to Review
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saathi-border)] border-t-[var(--saathi-primary)]"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-[var(--saathi-surface)] rounded-lg border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm">
            <StarSolid className="mx-auto h-12 w-12 text-[#D91E2A] mb-4" />
            <h2 className="text-lg font-bold text-[var(--saathi-primary)] mb-2">
              No reviews yet.
            </h2>
            <p className="text-sm text-[var(--saathi-text-secondary)] max-w-md mx-auto">
              User experiences will appear here as the SAATHI community grows. Be the first to leave a review!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div key={review._id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex -space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <StarSolid 
                        key={i} 
                        className={`w-5 h-5 ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-slate-700 font-medium text-sm mb-6 leading-relaxed line-clamp-4">
                  "{review.reviewText}"
                </p>
                
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-slate-800">Reviewer:</span> {review.reviewer?.firstName} {review.reviewer?.lastName} <span className="text-gray-400">({review.reviewer?.role})</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-slate-800">Reviewee:</span> {review.reviewee?.firstName} {review.reviewee?.lastName} <span className="text-gray-400">({review.reviewee?.role})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onReviewSubmitted={handleReviewSubmitted} 
      />
    </div>
  );
}
