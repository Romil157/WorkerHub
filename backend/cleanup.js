require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']); // For faster DNS resolution issues locally
const mongoose = require('mongoose');

const User = require('./src/models/User');
const Worker = require('./src/models/Worker');
const Customer = require('./src/models/Customer');
const Booking = require('./src/models/Booking');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let deletedWorkersCount = 0;
    
    // 1. Find all workers and populate userId
    // If userId is null (deleted User) or user.name is empty, prune it.
    const workers = await Worker.find().populate('userId');
    for (const w of workers) {
      if (!w.userId || !w.userId.name || w.userId.name.trim() === '') {
        console.log(`🗑️ Deleting Unknown Worker Profile ID: ${w._id}`);
        await Worker.findByIdAndDelete(w._id);
        
        // Also delete their active bookings if applicable
        await Booking.deleteMany({ workerId: w.userId?._id });
        
        if (w.userId) {
          await User.findByIdAndDelete(w.userId._id);
        }
        deletedWorkersCount++;
      }
    }

    // 2. Fallback check for any orphaned or blank-named Users in general
    const emptyUsers = await User.find({ 
      $or: [
        { name: { $exists: false } }, 
        { name: null }, 
        { name: '' },
        { name: ' ' }
      ] 
    });
    
    for (const u of emptyUsers) {
      console.log(`🗑️ Deleting Blank Name User ID: ${u._id}`);
      await User.findByIdAndDelete(u._id);
      await Worker.deleteMany({ userId: u._id });
      await Customer.deleteMany({ userId: u._id });
      deletedWorkersCount++;
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${deletedWorkersCount} unknown or improperly formatted workers.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanup();
