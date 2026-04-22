require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const mongoose = require('mongoose');

// We require models after dotenv is loaded
const User = require('./src/models/User');
const Worker = require('./src/models/Worker');


const CITIES = ['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

const WORKERS_DATA = [
  // ── MUMBAI ──────────────────────────────────────────────────────────────
  { name: 'Ramesh Patil', phone: '+919876500001', email: 'ramesh.patil@workerseed.in', city: 'Mumbai', skill: 'Plumbing', rate: 350, exp: 8, bio: 'Expert in bathroom fittings, pipe repair, and water heater installation.' },
  { name: 'Suresh Kamble', phone: '+919876500002', email: 'suresh.kamble@workerseed.in', city: 'Mumbai', skill: 'Electrical Work', rate: 400, exp: 10, bio: 'Licensed electrician. Specializes in wiring, panel upgrades, and safety inspections.' },
  { name: 'Mahesh Shinde', phone: '+919876500003', email: 'mahesh.shinde@workerseed.in', city: 'Mumbai', skill: 'Carpentry', rate: 300, exp: 6, bio: 'Custom furniture, door fitting, and wooden flooring expert.' },
  { name: 'Ganesh Sawant', phone: '+919876500004', email: 'ganesh.sawant@workerseed.in', city: 'Mumbai', skill: 'Painting', rate: 250, exp: 5, bio: 'Interior and exterior painting with premium quality finishes.' },
  { name: 'Dinesh Bhosale', phone: '+919876500005', email: 'dinesh.bhosale@workerseed.in', city: 'Mumbai', skill: 'AC Repair', rate: 500, exp: 12, bio: 'Certified AC technician — installation, servicing, and gas refill.' },

  // ── BANGALORE ──────────────────────────────────────────────────────────
  { name: 'Rajesh Kumar', phone: '+919876500011', email: 'rajesh.kumar@workerseed.in', city: 'Bangalore', skill: 'Plumbing', rate: 380, exp: 7, bio: 'Full home plumbing solutions including drainage and borewell.' },
  { name: 'Vinod Gowda', phone: '+919876500012', email: 'vinod.gowda@workerseed.in', city: 'Bangalore', skill: 'Electrical Work', rate: 420, exp: 9, bio: 'Smart home wiring, CCTV installation, and inverter setup.' },
  { name: 'Anand Reddy', phone: '+919876500013', email: 'anand.reddy@workerseed.in', city: 'Bangalore', skill: 'House Cleaning', rate: 200, exp: 4, bio: '5-star deep cleaning for apartments, offices and move-in/move-out.' },
  { name: 'Prasad Nair', phone: '+919876500014', email: 'prasad.nair@workerseed.in', city: 'Bangalore', skill: 'Gardening', rate: 220, exp: 6, bio: 'Landscape design, plant care, terrace garden setup.' },
  { name: 'Mohan Rao', phone: '+919876500015', email: 'mohan.rao@workerseed.in', city: 'Bangalore', skill: 'Home Appliance Repair', rate: 450, exp: 11, bio: 'Washing machine, refrigerator, microwave — all brands serviced.' },

  // ── DELHI ──────────────────────────────────────────────────────────────
  { name: 'Arun Sharma', phone: '+919876500021', email: 'arun.sharma@workerseed.in', city: 'Delhi', skill: 'Electrical Work', rate: 390, exp: 8, bio: 'Commercial and residential electrical work. 24/7 emergency service.' },
  { name: 'Deepak Gupta', phone: '+919876500022', email: 'deepak.gupta@workerseed.in', city: 'Delhi', skill: 'Carpentry', rate: 320, exp: 7, bio: 'Modular kitchen, wardrobe, and false ceiling expert.' },
  { name: 'Rakesh Verma', phone: '+919876500023', email: 'rakesh.verma@workerseed.in', city: 'Delhi', skill: 'Painting', rate: 280, exp: 9, bio: 'Texture painting, waterproofing, and wall art specialist.' },
  { name: 'Santosh Yadav', phone: '+919876500024', email: 'santosh.yadav@workerseed.in', city: 'Delhi', skill: 'Pest Control', rate: 350, exp: 5, bio: 'Eco-friendly pest control. Cockroaches, termites, mosquitoes, rats.' },
  { name: 'Vikram Singh', phone: '+919876500025', email: 'vikram.singh@workerseed.in', city: 'Delhi', skill: 'Plumbing', rate: 360, exp: 10, bio: 'RO installation, pipe replacement, bathroom fixture expert.' },

  // ── HYDERABAD ──────────────────────────────────────────────────────────
  { name: 'Krishna Naidu', phone: '+919876500031', email: 'krishna.naidu@workerseed.in', city: 'Hyderabad', skill: 'AC Repair', rate: 480, exp: 9, bio: 'Split AC, window AC, and centralized HVAC maintenance.' },
  { name: 'Ravi Chandra', phone: '+919876500032', email: 'ravi.chandra@workerseed.in', city: 'Hyderabad', skill: 'House Cleaning', rate: 190, exp: 3, bio: 'Trained cleaning staff. Sofa, carpet, and bathroom deep-clean.' },
  { name: 'Naresh Pillai', phone: '+919876500033', email: 'naresh.pillai@workerseed.in', city: 'Hyderabad', skill: 'Electrical Work', rate: 410, exp: 7, bio: 'Solar panel installation, EV charger setup, home automation.' },
  { name: 'Sunil Babu', phone: '+919876500034', email: 'sunil.babu@workerseed.in', city: 'Hyderabad', skill: 'Welding', rate: 550, exp: 14, bio: 'Gate fabrication, railing welding, structural steel work.' },
  { name: 'Balu Reddy', phone: '+919876500035', email: 'balu.reddy@workerseed.in', city: 'Hyderabad', skill: 'Plumbing', rate: 340, exp: 6, bio: 'Pipeline laying, bathroom renovation, water tank cleaning.' },

  // ── CHENNAI ──────────────────────────────────────────────────────────
  { name: 'Selvam Murugan', phone: '+919876500041', email: 'selvam.murugan@workerseed.in', city: 'Chennai', skill: 'Carpentry', rate: 290, exp: 8, bio: 'Traditional and modular woodwork. Furniture repair and polishing.' },
  { name: 'Arjun Iyer', phone: '+919876500042', email: 'arjun.iyer@workerseed.in', city: 'Chennai', skill: 'Painting', rate: 260, exp: 5, bio: 'Asian Paints and Berger certified painter. Free colour consultation.' },
  { name: 'Praveen Raja', phone: '+919876500043', email: 'praveen.raja@workerseed.in', city: 'Chennai', skill: 'Home Appliance Repair', rate: 430, exp: 10, bio: 'All home appliances including inverter AC, smart TVs, and chimneys.' },
  { name: 'Muthu Krishnan', phone: '+919876500044', email: 'muthu.krishnan@workerseed.in', city: 'Chennai', skill: 'Gardening', rate: 210, exp: 4, bio: 'Plant nursery advice, lawn maintenance, organic composting.' },
  { name: 'Senthil Kumar', phone: '+919876500045', email: 'senthil.kumar@workerseed.in', city: 'Chennai', skill: 'Pest Control', rate: 320, exp: 6, bio: 'Residential and commercial pest management. Annual contracts available.' },

  // ── KOLKATA ──────────────────────────────────────────────────────────
  { name: 'Subrata Das', phone: '+919876500051', email: 'subrata.das@workerseed.in', city: 'Kolkata', skill: 'Plumbing', rate: 300, exp: 7, bio: 'Geyser installation, tap fittings, and overhead tank repair.' },
  { name: 'Biplab Ghosh', phone: '+919876500052', email: 'biplab.ghosh@workerseed.in', city: 'Kolkata', skill: 'Electrical Work', rate: 370, exp: 9, bio: 'House wiring, generator connection, switchboard replacement.' },
  { name: 'Tapas Roy', phone: '+919876500053', email: 'tapas.roy@workerseed.in', city: 'Kolkata', skill: 'AC Repair', rate: 460, exp: 8, bio: 'Window and split AC installation, gas charging, annual AMC.' },
  { name: 'Sourav Mondal', phone: '+919876500054', email: 'sourav.mondal@workerseed.in', city: 'Kolkata', skill: 'House Cleaning', rate: 180, exp: 2, bio: 'Post-construction cleaning, festival cleaning, regular housekeeping.' },
  { name: 'Avik Sen', phone: '+919876500055', email: 'avik.sen@workerseed.in', city: 'Kolkata', skill: 'Welding', rate: 520, exp: 12, bio: 'MIG, TIG, and arc welding. Grille, gate, and industrial fabrication.' },

  // ── PUNE ──────────────────────────────────────────────────────────────
  { name: 'Sachin Pawar', phone: '+919876500061', email: 'sachin.pawar@workerseed.in', city: 'Pune', skill: 'Carpentry', rate: 310, exp: 6, bio: 'False ceiling, partition walls, and shuttering carpentry.' },
  { name: 'Nilesh Mane', phone: '+919876500062', email: 'nilesh.mane@workerseed.in', city: 'Pune', skill: 'Painting', rate: 270, exp: 7, bio: 'Stencil painting, weather-shield coating, terrace waterproofing.' },
  { name: 'Ajit Jadhav', phone: '+919876500063', email: 'ajit.jadhav@workerseed.in', city: 'Pune', skill: 'Pest Control', rate: 330, exp: 4, bio: 'Cockroach, bed bug, and termite treatment. Child-safe chemicals.' },
  { name: 'Sagar Kulkarni', phone: '+919876500064', email: 'sagar.kulkarni@workerseed.in', city: 'Pune', skill: 'Home Appliance Repair', rate: 440, exp: 8, bio: 'Washing machine, dishwasher, and water purifier specialist.' },
  { name: 'Prasanna Desai', phone: '+919876500065', email: 'prasanna.desai@workerseed.in', city: 'Pune', skill: 'Electrical Work', rate: 400, exp: 11, bio: 'Factory and residential wiring, MCB panel work, earthing.' },

  // ── AHMEDABAD ──────────────────────────────────────────────────────────
  { name: 'Hardik Patel', phone: '+919876500071', email: 'hardik.patel@workerseed.in', city: 'Ahmedabad', skill: 'Plumbing', rate: 330, exp: 5, bio: 'Underground pipeline, bathroom and kitchen plumbing expert.' },
  { name: 'Jignesh Shah', phone: '+919876500072', email: 'jignesh.shah@workerseed.in', city: 'Ahmedabad', skill: 'AC Repair', rate: 470, exp: 10, bio: 'VRF/VRV systems, cassette AC, and ductable unit servicing.' },
  { name: 'Ketan Trivedi', phone: '+919876500073', email: 'ketan.trivedi@workerseed.in', city: 'Ahmedabad', skill: 'Carpentry', rate: 295, exp: 7, bio: 'Shutters, lofts, and ready-to-assemble furniture installation.' },
  { name: 'Bhavesh Mehta', phone: '+919876500074', email: 'bhavesh.mehta@workerseed.in', city: 'Ahmedabad', skill: 'Gardening', rate: 230, exp: 5, bio: 'Vertical garden installation, balcony planters, drip irrigation setup.' },
  { name: 'Rakesh Soni', phone: '+919876500075', email: 'rakesh.soni@workerseed.in', city: 'Ahmedabad', skill: 'House Cleaning', rate: 195, exp: 3, bio: 'Marble polishing, bathroom sanitization, kitchen deep-clean.' },
];

const SKILLS = [
  'Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair', 
  'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair', 
  'Welding', 'Babysitting', 'Maid & Cooking', 'Dog Walking', 'Tutor', 
  'Driver', 'Beautician', 'Yoga Instructor'
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const w of WORKERS_DATA) {
      // Skip if phone or email already exists
      const exists = await User.findOne({ $or: [{ phone: w.phone }, { email: w.email }] });
      if (exists) { skipped++; continue; }

      // Pass RAW password — User model pre-save hook (bcrypt) handles hashing automatically
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=D4501D&color=fff&size=200&bold=true`;
      const user = await User.create({
        userType: 'worker',
        phone: w.phone,
        email: w.email,
        name: w.name,
        city: w.city,
        gender: 'M',
        passwordHash: 'Worker@123',   // ← raw; model will hash it
        avatar: avatarUrl,
        status: 'active',
      });

      // Secondary skills (randomly add 1-2 more)
      const otherSkills = SKILLS.filter(s => s !== w.skill);
      const extraSkills = otherSkills.slice(0, Math.floor(Math.random() * 2)).map(s => ({
        skillName: s,
        experience: Math.floor(Math.random() * w.exp),
        ratePerHour: Math.floor(w.rate * 0.8 + Math.random() * 100),
        rating: parseFloat((3 + Math.random() * 2).toFixed(1)),
        totalReviews: Math.floor(Math.random() * 20),
      }));

      const rating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
      const reviews = Math.floor(10 + Math.random() * 80);
      const jobs = Math.floor(reviews * 2.5);

      await Worker.create({
        userId: user._id,
        primarySkill: w.skill,
        cityOfOperation: w.city,
        bio: w.bio,
        yearsExperience: w.exp,
        skills: [
          {
            skillName: w.skill,
            experience: w.exp,
            ratePerHour: w.rate,
            rating,
            totalReviews: reviews,
          },
          ...extraSkills,
        ],
        overallRating: rating,
        totalReviews: reviews,
        totalJobsCompleted: jobs,
        completionRate: Math.floor(88 + Math.random() * 12),
        totalEarnings: Math.floor(jobs * w.rate * 2.5),
        isAvailableNow: Math.random() > 0.3, // 70% available
        verificationStatus: 'pending',
        registrationStep: 3, // Has completed Aadhaar step — shows in admin queue
        location: { type: 'Point', coordinates: [0, 0] }, // placeholder coords
      });

      created++;
      console.log(`✅ Created: ${w.name} (${w.city} — ${w.skill})`);
    }

    console.log(`\n🎉 Seed complete! ${created} workers created, ${skipped} skipped (already exist).`);
    console.log('   Default password for all seeded workers: Worker@123');

    // Patch avatars for any already-seeded workers that are missing one
    console.log('\n🖼️  Patching missing avatars on existing seeded workers...');
    let patched = 0;
    for (const w of WORKERS_DATA) {
      const user = await User.findOne({ email: w.email, avatar: { $in: ['', null, undefined] } });
      if (user) {
        user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=D4501D&color=fff&size=200&bold=true`;
        // Use updateOne to avoid triggering the password pre-save hook
        await User.updateOne({ _id: user._id }, { avatar: user.avatar });
        patched++;
      }
    }
    if (patched > 0) console.log(`✅ Patched avatars for ${patched} existing workers.`);
    else console.log('   All avatars already set.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
