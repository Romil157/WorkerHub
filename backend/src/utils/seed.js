require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const Skill = require('../models/Skill');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Admin = require('../models/Admin');
const Complaint = require('../models/Complaint');

const SKILLS_DATA = [
  { name: 'Plumbing', category: 'Home Repair', icon: '🔧', color: '#3498DB', averageRate: 450, description: 'Pipe work, tap repair, water systems' },
  { name: 'Electrical Work', category: 'Home Repair', icon: '⚡', color: '#F39C12', averageRate: 500, description: 'Wiring, installations, repairs' },
  { name: 'Carpentry', category: 'Home Improvement', icon: '🪚', color: '#8B4513', averageRate: 400, description: 'Furniture, woodwork, installations' },
  { name: 'Painting', category: 'Home Improvement', icon: '🎨', color: '#9B59B6', averageRate: 350, description: 'Interior and exterior painting' },
  { name: 'AC Repair', category: 'Appliances', icon: '❄️', color: '#1ABC9C', averageRate: 600, description: 'Air conditioner servicing and repair' },
  { name: 'House Cleaning', category: 'Cleaning', icon: '🧹', color: '#27AE60', averageRate: 300, description: 'Deep cleaning, regular cleaning' },
  { name: 'Pest Control', category: 'Cleaning', icon: '🐛', color: '#E74C3C', averageRate: 700, description: 'Cockroaches, rats, mosquitoes' },
  { name: 'Gardening', category: 'Outdoor', icon: '🌱', color: '#2ECC71', averageRate: 250, description: 'Garden maintenance, landscaping' },
  { name: 'Home Appliance Repair', category: 'Appliances', icon: '🔌', color: '#E67E22', averageRate: 400, description: 'Washing machines, fridges, microwaves' },
  { name: 'Welding', category: 'Construction', icon: '⚙️', color: '#7F8C8D', averageRate: 550, description: 'Metal work, gate repairs, fabrication' },
  { name: 'Bathroom Renovation', category: 'Construction', icon: '🚿', color: '#5DADE2', averageRate: 800, description: 'Tiles, fittings, full renovation' },
  { name: 'Roofing', category: 'Construction', icon: '🏠', color: '#D4501D', averageRate: 650, description: 'Waterproofing, roof repair' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Surat'];

const NAMES_BY_CITY = {
  Mumbai:    ['Rahul Patil', 'Sneha Desai', 'Ankit Sharma', 'Pooja Nair', 'Vijay Yadav', 'Riya Joshi', 'Manoj Gupta', 'Kavya Iyer', 'Sunil Thakur', 'Priti Mehta', 'Deepak Sawant', 'Neha Kulkarni'],
  Delhi:     ['Amit Verma', 'Sunita Kaur', 'Rohit Chauhan', 'Meena Sharma', 'Naveen Rana', 'Komal Arora', 'Sanjay Bhatt', 'Anjali Rawat', 'Harish Negi', 'Rekha Joshi', 'Pankaj Tiwari', 'Shweta Singh'],
  Bangalore: ['Rajesh Kumar', 'Priya Singh', 'Mohammed Farouk', 'Sunita Devi', 'Vikram Sharma', 'Divya Rao', 'Suresh Babu', 'Lakshmi Reddy', 'Kiran Naik', 'Manjunath Gowda', 'Sowmya Hegde', 'Ravi Shankar'],
  Hyderabad: ['Srinivas Reddy', 'Lakshmi Devi', 'Ravi Teja', 'Anusha Sharma', 'Venkat Rao', 'Preethi Nair', 'Naresh Babu', 'Madhuri Yadav', 'Kishore Kumar', 'Swathi Gupta', 'Prasad Chandra', 'Bhavani Iyer'],
  Chennai:   ['Murugan Pillai', 'Kavitha Rajan', 'Senthil Kumar', 'Meenakshi Amma', 'Arumugam Raj', 'Geetha Lakshmanan', 'Selvam Natarajan', 'Vijayalakshmi K', 'Karthik Subra', 'Anitha Devi', 'Balasubramanian', 'Thenmozhi R'],
  Kolkata:   ['Subhash Das', 'Rina Chakraborty', 'Tapan Ghosh', 'Mita Banerjee', 'Swarup Bose', 'Priyanka Roy', 'Dipak Sen', 'Ananya Chatterjee', 'Ratan Paul', 'Jhumpa Dutta', 'Sandip Mukherjee', 'Sreyashi Biswas'],
  Pune:      ['Sachin Shinde', 'Varsha Pawar', 'Dnyaneshwar Mane', 'Sujata Dhamle', 'Atul Gore', 'Madhuri Bhosle', 'Praful Jagtap', 'Sushma Chavan', 'Ganesh Waghmare', 'Lata Patil', 'Prashant Kale', 'Smita Khedkar'],
  Ahmedabad: ['Jayesh Patel', 'Hetal Shah', 'Bhavesh Modi', 'Rinal Trivedi', 'Chirag Panchal', 'Foram Joshi', 'Nilesh Desai', 'Rupa Gandhi', 'Vishal Mehta', 'Minal Bhatt', 'Paresh Kothari', 'Usha Parmar'],
  Surat:     ['Harshil Doshi', 'Khushbu Kapadia', 'Mitesh Vora', 'Jhanvi Gajjar', 'Tejas Kansara', 'Dipali Thakkar', 'Ritesh Parekh', 'Alpana Majithia', 'Kaushik Bhansali', 'Varsha Desai', 'Rushabh Mehta', 'Sweta Jariwala'],
};

const WORKERS_DATA = [];
let phoneIdx = 9100000000;

for (const city of CITIES) {
  const names = NAMES_BY_CITY[city];
  SKILLS_DATA.forEach((skill, idx) => {
    phoneIdx++;
    const workerName = names[idx % names.length];
    WORKERS_DATA.push({
      name: workerName,
      phone: `+91${phoneIdx}`,
      email: `worker.${city.toLowerCase()}.${idx + 1}@demo.workerhub.in`,
      city: city,
      skill: skill.name,
      rating: +(4.3 + Math.random() * 0.7).toFixed(1),
      jobs: Math.floor(Math.random() * 300) + 30,
      rate: skill.averageRate,
      experience: Math.floor(Math.random() * 12) + 1,
      bio: `Experienced ${skill.name} professional in ${city}. Delivering quality work with a smile. Fully verified and trusted.`,
      verificationStatus: 'verified',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(workerName)}&background=${skill.color.replace('#', '')}&color=fff&size=128`,
    });
  });
}

const CUSTOMERS_DATA = [
  { name: 'Anuj Mahajan', phone: '+919811111111', email: 'anuj@demo.workerhub.in', city: 'Bangalore' },
  { name: 'Deepa Reddy', phone: '+919811111112', email: 'deepa@demo.workerhub.in', city: 'Bangalore' },
  { name: 'Suresh Babu', phone: '+919811111113', email: 'suresh@demo.workerhub.in', city: 'Bangalore' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear ONLY demo/seed data — preserve real user registrations
  const demoEmailPattern = /.*@demo\.workerhub\.in$/;
  const demoUsers = await User.find({ email: demoEmailPattern }).select('_id');
  const demoUserIds = demoUsers.map(u => u._id);

  await Promise.all([
    User.deleteMany({ email: demoEmailPattern }),
    Worker.deleteMany({ userId: { $in: demoUserIds } }),
    Customer.deleteMany({ userId: { $in: demoUserIds } }),
    Skill.deleteMany({}),
    Booking.deleteMany({ $or: [
      { customerId: { $in: demoUserIds } },
      { workerId: { $in: demoUserIds } }
    ]}),
    Review.deleteMany({ $or: [
      { reviewerId: { $in: demoUserIds } },
      { reviewedId: { $in: demoUserIds } }
    ]}),
    Admin.deleteMany({}),
    Complaint.deleteMany({ userId: { $in: demoUserIds } }),
  ]);
  console.log(`🗑️  Cleared ${demoUserIds.length} demo accounts (real accounts preserved)`);

  // Seed skills
  const skills = await Skill.insertMany(SKILLS_DATA);
  console.log(`✅ Seeded ${skills.length} skills`);

  // Seed admin
  const admin = await Admin.create({
    email: process.env.ADMIN_INITIAL_EMAIL || 'admin@workerhub.in',
    name: 'Super Admin',
    passwordHash: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456',
    role: 'super_admin',
    permissions: ['verify_workers', 'manage_complaints', 'view_analytics', 'manage_users'],
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Seed workers
  const workerUsers = [];
  const workerProfiles = [];
  for (const w of WORKERS_DATA) {
    const user = await User.create({
      userType: 'worker', phone: w.phone, email: w.email, name: w.name,
      avatar: w.avatar, isVerified: w.verificationStatus === 'verified',
      phoneVerified: true, emailVerified: true, status: 'active',
      passwordHash: 'Demo@12345',  // will be bcrypt hashed by pre-save hook
      primaryAddress: { address: '123 Main St', city: w.city, pincode: '560001', label: 'Home' },
    });

    const skillObj = skills.find((s) => s.name === w.skill);
    const profile = await Worker.create({
      userId: user._id,
      primarySkill: w.skill,
      bio: w.bio,
      yearsExperience: w.experience,
      cityOfOperation: w.city,
      overallRating: w.rating,
      totalReviews: Math.floor(w.jobs * 0.7),
      totalJobsCompleted: w.jobs,
      completionRate: 96 + Math.floor(Math.random() * 4),
      responseTime: 5 + Math.floor(Math.random() * 10),
      totalEarnings: w.jobs * w.rate * 0.8,
      isAvailableNow: w.verificationStatus === 'verified',
      verificationStatus: w.verificationStatus,
      skills: [{
        skillId: skillObj?._id,
        skillName: w.skill,
        experience: w.experience,
        certified: true,
        rating: w.rating,
        totalReviews: Math.floor(w.jobs * 0.7),
        ratePerHour: w.rate,
      }],
      aadhar: {
        number: '123456789012',
        fullName: w.name,
        frontPhoto: 'https://via.placeholder.com/400x250?text=Aadhar+Front',
        backPhoto: 'https://via.placeholder.com/400x250?text=Aadhar+Back',
        verified: w.verificationStatus === 'verified',
      },
      insurance: {
        provider: 'ICICI General',
        policyNumber: `POL${Date.now()}`,
        holderName: w.name,
        coverageAmount: 500000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        status: w.verificationStatus === 'verified' ? 'active' : 'pending',
        verified: w.verificationStatus === 'verified',
      },
      bankDetails: {
        bankName: 'HDFC Bank',
        accountHolderName: w.name,
        accountNumber: '5432109876',
        ifscCode: 'HDFC0001234',
        verified: w.verificationStatus === 'verified',
      },
      location: { type: 'Point', coordinates: [77.5946 + (Math.random() - 0.5) * 0.1, 12.9716 + (Math.random() - 0.5) * 0.1] },
      verificationDocuments: {
        aadhar: w.verificationStatus === 'verified' ? 'verified' : 'pending',
        insurance: w.verificationStatus === 'verified' ? 'verified' : 'pending',
        bankDetails: w.verificationStatus === 'verified' ? 'verified' : 'pending',
        portfolio: w.verificationStatus === 'verified' ? 'verified' : 'pending',
      },
      portfolio: [
        { imageUrl: 'https://via.placeholder.com/400x300?text=Before+Work', description: 'Before repair', skill: w.skill, beforeAfter: 'before', adminReview: 'approved' },
        { imageUrl: 'https://via.placeholder.com/400x300?text=After+Work', description: 'After repair - excellent finish', skill: w.skill, beforeAfter: 'after', adminReview: 'approved' },
      ],
    });

    workerUsers.push(user);
    workerProfiles.push(profile);
  }
  console.log(`✅ Seeded ${workerUsers.length} workers`);

  // Seed customers
  const customerUsers = [];
  for (const c of CUSTOMERS_DATA) {
    const user = await User.create({
      userType: 'customer', phone: c.phone, email: c.email, name: c.name,
      isVerified: true, phoneVerified: true, emailVerified: true, status: 'active',
      passwordHash: 'Demo@12345',  // will be bcrypt hashed by pre-save hook
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=FAF5F0&color=2C2C2C&size=128`,
      primaryAddress: { address: '456 Park Lane', city: c.city, pincode: '560034', label: 'Home' },
    });
    await Customer.create({ userId: user._id, totalBookings: 3, completedBookings: 2 });
    customerUsers.push(user);
  }
  console.log(`✅ Seeded ${customerUsers.length} customers`);

  // Seed bookings (10 across different statuses)
  const BOOKING_SCENARIOS = [
    { status: 'completed', paymentStatus: 'completed', skill: 'Plumbing', amount: 650, workerIdx: 0, customerIdx: 0 },
    { status: 'completed', paymentStatus: 'completed', skill: 'Electrical Work', amount: 800, workerIdx: 1, customerIdx: 1 },
    { status: 'completed', paymentStatus: 'completed', skill: 'Carpentry', amount: 1200, workerIdx: 2, customerIdx: 2 },
    { status: 'accepted', paymentStatus: 'completed', skill: 'Plumbing', amount: 500, workerIdx: 0, customerIdx: 1 },
    { status: 'pending', paymentStatus: 'unpaid', skill: 'Electrical Work', amount: 550, workerIdx: 1, customerIdx: 0 },
    { status: 'in_progress', paymentStatus: 'completed', skill: 'Painting', amount: 900, workerIdx: 3, customerIdx: 2 },
    { status: 'cancelled', paymentStatus: 'refunded', skill: 'AC Repair', amount: 600, workerIdx: 4, customerIdx: 0 },
    { status: 'completed', paymentStatus: 'completed', skill: 'Plumbing', amount: 450, workerIdx: 0, customerIdx: 2 },
    { status: 'completed', paymentStatus: 'completed', skill: 'Carpentry', amount: 750, workerIdx: 2, customerIdx: 1 },
    { status: 'pending', paymentStatus: 'unpaid', skill: 'Electrical Work', amount: 600, workerIdx: 1, customerIdx: 2 },
  ];

  const bookings = [];
  for (let i = 0; i < BOOKING_SCENARIOS.length; i++) {
    const s = BOOKING_SCENARIOS[i];
    const worker = workerUsers[s.workerIdx];
    const customer = customerUsers[s.customerIdx];
    const workerProfile = workerProfiles[s.workerIdx];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (i % 5) - 2);

    const subtotal = s.amount;
    const platformFee = Math.round(subtotal * 0.15);

    const booking = await Booking.create({
      customerId: customer._id,
      workerId: worker._id,
      workerProfileId: workerProfile._id,
      skillRequired: s.skill,
      description: `Fix ${s.skill.toLowerCase()} issue at home. Need urgent attention.`,
      location: { address: '456 Park Lane, Koramangala', city: 'Bangalore', pincode: '560034' },
      scheduledDate,
      scheduledTime: '14:00',
      estimatedDuration: 60,
      workerRate: s.amount,
      durationHours: 1,
      subtotal,
      platformFeePercent: 15,
      platformFee,
      totalAmount: subtotal + platformFee,
      paymentMethod: 'upi',
      paymentStatus: s.paymentStatus,
      status: s.status,
      completedAt: s.status === 'completed' ? new Date() : undefined,
      acceptedAt: ['accepted', 'in_progress', 'completed'].includes(s.status) ? new Date() : undefined,
      cancelledBy: s.status === 'cancelled' ? 'customer' : undefined,
      cancellationReason: s.status === 'cancelled' ? 'Worker was unavailable' : undefined,
    });
    bookings.push(booking);
  }
  console.log(`✅ Seeded ${bookings.length} bookings`);

  // Seed reviews for completed bookings
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const reviewTexts = [
    'Excellent work! Very professional and clean. Fixed the problem in 30 minutes.',
    'Great service! Highly recommended. Will book again.',
    'Knowledgeable and efficient. Fair pricing.',
    'Punctual and did a great job. Happy with the result.',
    'Very experienced. Explained everything well.',
  ];

  for (let i = 0; i < completedBookings.length; i++) {
    const booking = completedBookings[i];
    const rating = 4 + Math.round(Math.random());
    await Review.create({
      bookingId: booking._id,
      reviewerId: booking.customerId,
      reviewedId: booking.workerId,
      reviewerType: 'customer',
      rating,
      text: reviewTexts[i % reviewTexts.length],
      isVerified: true,
      helpfulCount: Math.floor(Math.random() * 20),
    });
  }
  console.log(`✅ Seeded ${completedBookings.length} reviews`);

  // Seed 1 open complaint
  await Complaint.create({
    complainantId: customerUsers[0]._id,
    complainantType: 'customer',
    respondentId: workerUsers[4]._id,
    bookingId: bookings[6]._id,
    reason: 'Poor service quality',
    description: 'The AC repair was done incorrectly. It stopped working the next day.',
    status: 'open',
    priority: 'high',
    timeline: [{ action: 'Complaint filed by customer', performedByRole: 'customer', timestamp: new Date() }],
  });
  console.log('✅ Seeded 1 complaint');

  console.log('\n🚀 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 DEMO LOGIN CREDENTIALS');
  console.log('Admin:    admin@workerhub.in         / Admin@123456');
  console.log('Workers:  rajesh@demo.workerhub.in   / Demo@12345');
  console.log('          priya@demo.workerhub.in    / Demo@12345');
  console.log('          farouk@demo.workerhub.in   / Demo@12345');
  console.log('Customer: anuj@demo.workerhub.in     / Demo@12345');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });
