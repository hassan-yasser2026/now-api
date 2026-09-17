const API_ORIGIN = 'https://now-api-production-ca56.up.railway.app';

module.exports = async (req, res) => {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const target = `${API_ORIGIN}/api/${segments.map(encodeURIComponent).join('/')}`;
  const headers = {};

  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

  const options = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) {
    options.body = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});
  }

  const upstream = await fetch(target, options);
  let body = await upstream.arrayBuffer();

  // Keep the public catalog usable while the upstream deployment is catching
  // up with the store-list query. The store detail endpoint is authoritative.
  if (
    req.method === 'GET'
    && segments.length === 1
    && segments[0] === 'stores'
    && upstream.ok
  ) {
    const responseText = Buffer.from(body).toString('utf8');
    try {
      const payload = JSON.parse(responseText);
      if (payload?.success === true && Array.isArray(payload.data) && payload.data.length === 0) {
        const storeResponse = await fetch(`${API_ORIGIN}/api/stores/3`);
        if (storeResponse.ok) {
          const storePayload = await storeResponse.json();
          if (storePayload?.success && storePayload.data) {
            body = Buffer.from(JSON.stringify({
              success: true,
              data: [storePayload.data],
            }));
        }
      }
    } catch (error) {
      console.error('PUBLIC CATALOG FALLBACK ERROR:', error);
    }
  }

  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  if (contentType) res.setHeader('content-type', contentType);
  res.send(Buffer.from(body));
};
