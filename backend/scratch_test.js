require('dotenv').config();
const mongoose = require('mongoose');
const Worker = require('../src/models/Worker');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    try {
        const worker = await Worker.findOne({ verificationStatus: 'pending' });
        if(!worker) {
            console.log("No pending workers found");
            process.exit(0);
        }
        
        worker.verificationStatus = 'verified';
        worker.verifiedAt = new Date();
        worker.verificationDocuments = { aadhar: 'verified', insurance: 'verified', bankDetails: 'verified', portfolio: 'verified' };
        
        console.log("Attempting to save worker...");
        await worker.save();
        console.log("Successfully saved!");
    } catch (e) {
        console.error("Validation Error:", e.message);
        if (e.errors) {
            Object.keys(e.errors).forEach(key => {
                console.error(`- ${key}: ${e.errors[key].message}`);
            });
        }
    }
    process.exit(0);
});
