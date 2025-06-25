const axios = require('axios');

async function getRecommendations(userId) {
  try {
    const response = await axios.get(`http://localhost:8001/recommend`, {
      params: { user_id: userId }
    });

    if (response.data.success) {
      return response.data.results;
    } else {
      throw new Error(response.data.error || 'Unknown recommendation error');
    }
  }catch (err) {
  console.error("Recommendation fetch failed:", err?.response?.data || err.message || err);
  return [];
}

}

module.exports = { getRecommendations };
