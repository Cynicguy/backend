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

app.post('/send-otp', async (req, res) => {
  const { phone, name } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    otpStore.set(phone, otp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

app.post('/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;

  if (otpStore.get(phone) === otp) {
    // Add user to Supabase
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ name, phone }]);

    if (error) {
      console.error(error);
      return res.json({ success: false, message: "Failed to save profile" });
    }

    otpStore.delete(phone); // clean up
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid OTP' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

