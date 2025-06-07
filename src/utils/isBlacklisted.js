const blacklist = require('./blacklistWords');

function isBlacklisted(text) {
  const lower = text.toLowerCase();
  return blacklist.some(word => lower.includes(word));
}

module.exports = { isBlacklisted };
