const API_ORIGIN = 'https://now-api-production-ca56.up.railway.app';

module.exports = async (req, res) => {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const target = `${API_ORIGIN}/api/${segments.map(encodeURIComponent).join('/')}`;

  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

  const options = {
    method: req.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }

  const upstream = await fetch(target, options);
  const body = await upstream.arrayBuffer();

  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  if (contentType) res.setHeader('content-type', contentType);
  res.send(Buffer.from(body));
};
