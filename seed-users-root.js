import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Try loading .env.local first (Next.js precedence)
dotenv.config({ path: '.env.local' });
// Then load .env (won't override existing vars)
dotenv.config();

const USERS_TO_CREATE = [
    {
        email: 'medium@einflix.com',
        password: 'medium',
        name: 'Usuario Medium',
        planType: 'medium'
    },
    {
        email: 'basico@einflix.com',
        password: 'basico',
        name: 'Usuario Basico',
        planType: 'basic'
    }
];

async function seedUsers() {
    try {
        const dbConnect = (await import('./lib/mongodb.js')).default;
        const User = (await import('./models/User.js')).default;

        console.log("Connecting to DB...");
        await dbConnect();

        for (const userData of USERS_TO_CREATE) {
            console.log(`Processing user: ${userData.email}`);
            let user = await User.findOne({ email: userData.email });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const updateData = {
                name: userData.name,
                password: hashedPassword,
                planType: userData.planType,
                isPaid: true,
                subscriptionExpiry: new Date('2025-12-31') // Valid until end of year
            };

            if (user) {
                console.log(`User exists. Updating to Plan: ${userData.planType}`);
                Object.assign(user, updateData);
                await user.save();
            } else {
                console.log(`Creating new user with Plan: ${userData.planType}`);
                await User.create({
                    email: userData.email,
                    ...updateData
                });
            }
            console.log(`✓ Access ready for ${userData.email}`);
        }

        console.log("\nAll requested users created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding users:");
        console.error(error);
        process.exit(1);
    }
}

seedUsers();
