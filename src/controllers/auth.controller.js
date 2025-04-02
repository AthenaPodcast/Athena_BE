require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const transporter = require('../config/email');
const generateToken = require('../utils/generateToken');
const { findAccountByEmail, createAccount, verifyAccountEmail } = require('../models/account.model');
const { createUserProfile } = require('../models/userProfile.model');

// SIGNUP
const signup = async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

  try {
    console.log('STEP 1: Validating input');

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    console.log('STEP 2: Checking if email exists');
    const existingUser = await findAccountByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    console.log('STEP 3: Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('STEP 4: Inserting into Accounts');
    const accountId = await createAccount(email, phone, hashedPassword);

    console.log('STEP 5: Inserting into UserProfile');
    await createUserProfile(accountId, firstName, lastName);

    console.log('STEP 6: Creating verification token');
    const token = generateToken({ accountId });

    const verificationLink = `http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${token}`;

    console.log('STEP 7: Sending verification email');
    try {
      await transporter.sendMail({
        from: `"Athena" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Verify your email - AthenaBroadcast',
        html: `
          <h3>Welcome to AthenaBroadcast, ${firstName}!</h3>
          <p>Please click the link below to verify your email:</p>
          <a href="${verificationLink}">${verificationLink}</a>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Failed to send verification email:', emailErr);
      return res.status(500).json({ message: 'Signup succeeded, but failed to send verification email.' });
    }

    console.log('✅ Signup completed successfully');
    res.status(201).json({ message: 'Account created. Please check your email to verify.' });

  } catch (error) {
    console.error('❌ Signup error:', error.stack);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// VERIFY EMAIL
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const accountId = decoded.accountId;

    await verifyAccountEmail(accountId);

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // 1. Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
  
      // 2. Check if account exists
      const user = await findAccountByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      // 3. Check if email is verified
      if (!user.email_verified) {
        return res.status(403).json({ message: 'Email is not verified' });
      }
  
      // 4. Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      // 5. Generate JWT
      const token = generateToken({ accountId: user.id });
  
      res.status(200).json({ message: 'Login successful', token });
  
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  };

module.exports = {
  signup,
  verifyEmail,
  login,
};
