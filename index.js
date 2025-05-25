const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');
const { supabase } = require('./supabaseClient');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Temporary in-memory OTP store (for demo only)
const otpStore = new Map();

// Send OTP API
app.post('/send-otp', async (req, res) => {
  const { phone, name } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ success: false, message: 'Phone and Name required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    otpStore.set(phone, otp);
    setTimeout(() => otpStore.delete(phone), 180000); // Deletes OTP after 3 mins

    res.json({ success: true });
  } catch (err) {
    console.error("Twilio Error:", err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP API
app.post('/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp || !name) {
    return res.status(400).json({ success: false, message: 'Phone, OTP, and Name are required' });
  }

  if (otpStore.get(phone) === otp) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ name, phone }]);

      if (error) {
        console.error("Supabase Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to save profile" });
      }

      otpStore.delete(phone); // clean up
      res.json({ success: true });
    } catch (err) {
      console.error("Supabase Insertion Error:", err.message);
      res.status(500).json({ success: false, message: 'Something went wrong' });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
