import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const email = process.argv[2];

if (!email) {
    console.log("Usage: node scripts/manual-approve.js <email>");
    process.exit(1);
}

async function approveUser() {
    try {
        console.log("Connecting to DB...");
        await dbConnect();

        console.log(`Searching for user: ${email}`);
        const user = await User.findOne({ email });

        if (!user) {
            console.error("User not found!");
            process.exit(1);
        }

        console.log(`Current Status -> Plan: ${user.planType}, Paid: ${user.isPaid}`);

        user.isPaid = true;
        // Ensure planType is set, default to basic if missing
        if (!user.planType) user.planType = 'basic';

        // Set expiry to 1 month from now
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        user.subscriptionExpiry = nextMonth;

        await user.save();

        console.log(`SUCCESS! Updated ${user.email}:`);
        console.log(`- isPaid: true`);
        console.log(`- Plan: ${user.planType}`);
        console.log(`- Expiry: ${user.subscriptionExpiry}`);
        console.log("\nNow try logging in again!");

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

approveUser();
