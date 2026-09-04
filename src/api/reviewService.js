const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');
const apiBaseUrl = configuredBaseUrl.replace(/\/api\/auth\/?$/, '').replace(/\/$/, '');

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const reviewService = {
  createReview: async (reviewData) => {
    const response = await fetch(`${apiBaseUrl}/api/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit review');
    }
    return response.json();
  },
  
  getAllReviews: async () => {
    const response = await fetch(`${apiBaseUrl}/api/reviews`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },
  
  getUserReviews: async (userId) => {
    const response = await fetch(`${apiBaseUrl}/api/reviews/user/${userId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch user reviews');
    return response.json();
  },
  
  getReviewableUsers: async () => {
    const response = await fetch(`${apiBaseUrl}/api/reviews/users/reviewable`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch reviewable users');
    return response.json();
  }
};
