require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stagepass';

async function createAdmin() {
  const args = process.argv.slice(2);
  const username = args[0] || 'superadmin';
  const email = args[1] || 'admin@stagepass.com';
  const password = args[2] || 'ChangeMe123!';
  const role = args[3] || 'superadmin';

  console.log('\n🏗️  StagePass Admin Creator\n');

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      console.log('⚠️  Admin already exists. Updating password...');
      existing.password = password;
      existing.role = role;
      await existing.save();
      console.log('✅ Admin updated!');
    } else {
      const admin = new Admin({ username, email, password, role });
      await admin.save();
      console.log('✅ Admin created!');
    }

    console.log(`\n📋 Login with: { "username": "${username}", "password": "${password}" }\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
