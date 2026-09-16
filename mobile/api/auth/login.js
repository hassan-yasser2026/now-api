const API_URL = 'https://now-api-production-ca56.up.railway.app/api/auth/login';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
  });
  const body = await upstream.text();
  res.status(upstream.status).setHeader(
    'content-type',
    upstream.headers.get('content-type') || 'application/json',
  );
  res.send(body);
};
