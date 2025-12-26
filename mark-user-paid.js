import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment');
    process.exit(1);
}

// Connect to MongoDB
await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB');

// Define User schema (minimal)
const UserSchema = new mongoose.Schema({
    email: String,
    isPaid: Boolean,
    planType: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

// Update user
const email = 'yguajardov@gmail.com';
const result = await User.updateOne(
    { email },
    {
        $set: {
            isPaid: true,
            planType: 'total'
        }
    }
);

console.log(`✅ Updated user ${email}:`, result);

const user = await User.findOne({ email });
console.log('User status:', { email: user.email, isPaid: user.isPaid, planType: user.planType });

await mongoose.disconnect();
console.log('✅ Done');
