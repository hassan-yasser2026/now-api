function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self)');
  next();
}

function createRateLimiter({ windowMs, max, keyGenerator = (req) => req.ip || 'unknown' }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count <= max) return next();

    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again shortly.',
    });
  };
}

module.exports = { setSecurityHeaders, createRateLimiter };
