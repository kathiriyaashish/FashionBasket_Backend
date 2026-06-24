const nodemailer = require('nodemailer');

// ✅ CORRECT SYNTAX - createTransport (NOT createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Fashion Basket - Your OTP Code',
      html: `
        <h2>🔐 Your OTP Code</h2>
        <h1 style="color: #007bff; font-size: 2em">${otp}</h1>
        <p>This OTP is valid for <strong>5 minutes</strong> only.</p>
        <hr>
        <p>Fashion Basket Team</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
};

module.exports = { sendOTP };
