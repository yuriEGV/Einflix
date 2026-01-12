import User from './models/User.js';
import dbConnect from './lib/mongodb.js';

async function checkUser() {
    try {
        await dbConnect();
        const user = await User.findOne({ email: /marisol/i });
        if (user) {
            console.log('Usuario encontrado:');
            console.log(JSON.stringify({
                email: user.email,
                name: user.name,
                planType: user.planType,
                isPaid: user.isPaid,
                createdAt: user.createdAt
            }, null, 2));
        } else {
            console.log('Usuario "marisol" no encontrado');
            console.log('\nBuscando todos los usuarios...');
            const allUsers = await User.find({}).limit(10);
            console.log(`Total usuarios: ${allUsers.length}`);
            allUsers.forEach(u => {
                console.log(`- ${u.email} (Plan: ${u.planType}, Paid: ${u.isPaid})`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkUser();
