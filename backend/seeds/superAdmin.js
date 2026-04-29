const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');

// =======================================
// LOAD ENV FILE PROPERLY (IMPORTANT FIX)
// =======================================
require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

// =======================================
// CONNECT TO MONGODB
// =======================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
};

// =======================================
// CREATE SUPER ADMIN
// =======================================
const createSuperAdmin = async () => {
  try {
    await connectDB();

    const exists = await User.findOne({ role: 'superadmin' });

    if (exists) {
      console.log('⚠️ Superadmin already exists');
      process.exit();
    }

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'domee.clothing@gmail.com',
      password: 'lifeishard0806', // auto-hashed by schema middleware
      role: 'admin'
    });

    console.log('🔥 Superadmin created successfully');
    console.log({
      email: superAdmin.email,
      role: superAdmin.role
    });

    process.exit();
  } catch (err) {
    console.error('❌ Error creating superadmin:', err);
    process.exit(1);
  }
};

// =======================================
// RUN SCRIPT
// =======================================
createSuperAdmin();