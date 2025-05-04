import jwt from 'jsonwebtoken';

// Main authentication middleware
export const authenticate = (req, res, next) => {
  // 1. Check cookies first
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  
  // 2. Reject if no token
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Verify JWT
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Clear invalid token
      res.clearCookie('token');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // 4. Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  });
};

// Role-based access control
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // 1. Get token from cookies or Authorization header
    const token = req.cookies.token || 
                 req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // 2. Verify and decode token directly
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const role = decoded.role;

      // 3. Check against allowed roles
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: `Requires ${allowedRoles.join(' or ')} role. Your role: ${role}`
        });
      }

      // 4. Attach token payload for subsequent middleware
      req.tokenPayload = decoded;
      next();

    } catch (error) {
      // Handle different error types
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
};

// Admin-specific shortcut
export const isAdmin = checkRole(['admin']);

// For routes that need either admin or moderator
export const isStaff = checkRole(['admin', 'moderator']);