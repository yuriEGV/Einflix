import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("Loading env from:", path.join(__dirname, '../.env'));

// Shim for lib/mongodb.js which expects MONGO_URI
if (process.env.MONGODB_URI && !process.env.MONGO_URI) {
    process.env.MONGO_URI = process.env.MONGODB_URI;
}

console.log("MONGODB_URI:", process.env.MONGODB_URI ? "LOADED" : "MISSING");
console.log("MONGO_URI:", process.env.MONGO_URI ? "LOADED" : "MISSING");

const ADMIN_EMAIL = 'admin@einflix.com';
const ADMIN_PASS = 'admin';

async function createAdmin() {
    try {
        const dbConnect = (await import('../lib/mongodb.js')).default;
        const User = (await import('../models/User.js')).default;

        console.log("Connecting to DB...");
        await dbConnect();

        console.log(`Checking for existing admin user: ${ADMIN_EMAIL}`);
        let user = await User.findOne({ email: ADMIN_EMAIL });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASS, salt);

        if (user) {
            console.log("Admin user exists. Updating permissions...");
            user.password = hashedPassword;
            user.planType = 'total';
            user.isPaid = true;
            user.subscriptionExpiry = new Date('2099-12-31');
            user.name = 'Super Admin';
            await user.save();
        } else {
            console.log("Creating new admin user...");
            user = await User.create({
                name: 'Super Admin',
                email: ADMIN_EMAIL,
                password: hashedPassword,
                planType: 'total',
                isPaid: true,
                subscriptionExpiry: new Date('2099-12-31')
            });
        }

        console.log("SUCCESS! Admin account ready.");
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASS}`);
        console.log(`Plan: ${user.planType}`);
        console.log(`Expiry: ${user.subscriptionExpiry}`);

        process.exit(0);
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
}

createAdmin();
