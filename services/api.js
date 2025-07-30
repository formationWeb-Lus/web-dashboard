const axios = require('axios');

const BASE_API = process.env.API_BASE || 'https://gps-database.onrender.com/api/pending';

module.exports = {
  getPositions: async (vehiculeId) => {
    const res = await axios.get(`${BASE_API}/positions`, {
      headers: {
        Authorization: 'Bearer VOTRE_TOKEN_ICI', // à générer selon /api/vehicule-token
      }
    });
    return res.data;
  },

  getHistoriques: async (userId) => {
    const res = await axios.get(`${BASE_API}/historiques`, {
      headers: {
        Authorization: 'Bearer VOTRE_TOKEN_ICI',
      }
    });
    return res.data;
  }
};
