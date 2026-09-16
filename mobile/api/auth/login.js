const API_URL = 'https://now-api-production-ca56.up.railway.app/api/auth/login';

const readBody = async (req) => {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const body = await readBody(req);
  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const body = await upstream.text();
  res.status(upstream.status).setHeader(
    'content-type',
    upstream.headers.get('content-type') || 'application/json',
  );
  res.send(body);
};
