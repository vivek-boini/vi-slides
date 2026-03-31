import express from 'express';
import { body } from 'express-validator';
import {
    register,
    login,
    getMe,
    updateDetails,
    googleLogin,
    getLeaderboard,
    forgotPasswordCheckEmail,
    forgotPasswordReset
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/auth/leaderboard
// @desc    Get top users by points
// @access  Public
router.get('/leaderboard', getLeaderboard);

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('role')
            .isIn(['Teacher', 'Student', 'teacher', 'student'])
            .withMessage('Role must be either teacher or student')
    ],
    register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    login
);

router.post(
    '/forgot-password/check-email',
    [
        body('email').isEmail().withMessage('Please provide a valid email')
    ],
    forgotPasswordCheckEmail
);

router.post(
    '/forgot-password/reset',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
    ],
    forgotPasswordReset
);

// @route   POST /api/auth/google
// @desc    Login/Register with Google
// @access  Public
router.post('/google', googleLogin);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, getMe);

// @route   PUT /api/auth/updatedetails
// @desc    Update user details
// @access  Private
router.put(
    '/updatedetails',
    protect,
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please provide a valid email')
    ],
    updateDetails
);

export default router;



// http://localhost:5001/api/auth/register

// {
//   "name": "John Teacher",
//   "email": "teacher@example.com",
//   "password": "password123",
//   "role": "Teacher"
// }


// http://localhost:5001/api/auth/login

// {
//   "email": "teacher@example.com",
//   "password": "password123"
// }



// http://localhost:5001/api/auth/me
// body none