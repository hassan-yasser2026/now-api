const API_URL = 'https://now-api-production-ca56.up.railway.app/api/auth/login';

const readBody = async (req) => {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const requestBody = await readBody(req);
  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: requestBody,
  });
  const upstreamBody = await upstream.text();
  res.status(upstream.status).setHeader(
    'content-type',
    upstream.headers.get('content-type') || 'application/json',
  );
  res.send(upstreamBody);
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
// مسودة المشروع - البشمهندس حسن ياسر
