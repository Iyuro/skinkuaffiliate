// Single-entry router to reduce number of Vercel Serverless Functions.
// All real handlers live under server/impl/ and are invoked here based on ?op=...
const urlLib = require('url');

module.exports = async function handler(req, res) {
  // simple CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const u = urlLib.parse(req.url, true);
  const op = (u.query && u.query.op) || null;
  try {
    if (!op) return res.status(400).json({ ok: false, error: 'op missing' });
    // map op to handler
    switch (op) {
      case 'create-challenge': return require('../server/impl/create-challenge')(req, res);
      case 'list-challenges': return require('../server/impl/list-challenges')(req, res);
      case 'get-challenge': return require('../server/impl/get-challenge')(req, res);
      case 'submit-challenge': return require('../server/impl/submit-challenge')(req, res);
      case 'list-submissions': return require('../server/impl/list-submissions')(req, res);
      case 'pick-winner': return require('../server/impl/pick-winner')(req, res);
      case 'broadcast-reminders': return require('../server/impl/broadcast-reminders')(req, res);
      case 'telegram-webhook': return require('../server/impl/telegram-webhook')(req, res);
      default:
        return res.status(404).json({ ok: false, error: 'unknown op' });
    }
  } catch (err) {
    console.error('router error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
