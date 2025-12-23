import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Try loading .env.local first (Next.js precedence)
dotenv.config({ path: '.env.local' });
// Then load .env (won't override existing vars)
dotenv.config();

const ADMIN_EMAIL = 'admin@einflix.com';
const ADMIN_PASS = 'admin';

async function createAdmin() {
    try {
        const dbConnect = (await import('./lib/mongodb.js')).default;
        const User = (await import('./models/User.js')).default;

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
        console.error("Error creating admin:");
        console.error(error); // Full object
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        process.exit(1);
    }
}

createAdmin();
