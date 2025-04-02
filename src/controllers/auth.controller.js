require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db');
const nodemailer = require('nodemailer');

// SIGNUP CONTROLLER
const signup = async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

  try {
    console.log('STEP 1: Validating input');

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate email format before anything else
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
    }

    console.log('STEP 2: Checking if email exists');
    const existingUser = await pool.query('SELECT * FROM Accounts WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    console.log('STEP 3: Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('STEP 4: Inserting into Accounts');
    const result = await pool.query(
      `INSERT INTO Accounts (email, phone, password_hash, email_verified, account_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, phone, hashedPassword, false, 'regular']
    );

    const accountId = result.rows[0].id;

    console.log('STEP 5: Inserting into UserProfile');
    await pool.query(
      `INSERT INTO UserProfile (account_id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [accountId, firstName, lastName]
    );

    console.log('STEP 6: Creating verification token');
    const token = jwt.sign({ accountId }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verificationLink = `http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${token}`;

    console.log('STEP 7: Sending verification email');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

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
    console.error('❌ FULL ERROR LOG:', error.stack);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// VERIFY EMAIL CONTROLLER
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const accountId = decoded.accountId;

    await pool.query(
      `UPDATE Accounts SET email_verified = true WHERE id = $1`,
      [accountId]
    );

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

// TEMPORARY LOGIN STUB (to avoid crash if used)
const login = (req, res) => {
  res.send('Login route not implemented yet');
};

module.exports = {
  signup,
  verifyEmail,
  login,
};
