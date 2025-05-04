import jwt from 'jsonwebtoken';

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token; // Get token from HttpOnly cookie named 'authToken'

    if (!token) {
        console.log('Auth middleware: No token cookie found');
        // No token provided, user is not authenticated
        return res.status(401).json({ message: 'Authentication required: No token provided' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        console.log('Attempting to verify token...');
        
        if (err) {
            console.error('Auth middleware: Token verification failed -', err.message);
            // If token is invalid (e.g., expired, tampered), clear the cookie
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict', // Match the setting used during login
            });
            return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
        }

        // Make sure we have the required user data
        if (!decoded.userId) {
            console.error('Auth middleware: Token missing userId');
            return res.status(403).json({ message: 'Invalid token format' });
        }

        // Attach user info to request object
        req.user = {
            id: decoded.userId,      // Change to match the JWT payload
            email: decoded.email,
            role: decoded.role
        };

        console.log('Auth middleware: Token verified for user:', req.user.id);
        next();
    });
};

export default authenticateToken;