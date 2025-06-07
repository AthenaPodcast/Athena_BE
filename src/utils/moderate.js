const axios = require('axios');

async function isInappropriate(comment) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/moderations',
      { input: comment },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.results[0].flagged;
  } catch (error) {
    // Fail safe assume it's appropriate to not block all reviews if API fails
    console.error("Moderation API Error:", error.response?.data || error.message);
    return false;
  }
}

module.exports = { isInappropriate };
