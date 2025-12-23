import mercadopago from 'mercadopago';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load envs
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testToken() {
    const token = process.env.MP_ACCESS_TOKEN;

    console.log("\n=== TESTING MERCADO PAGO TOKEN ===");
    console.log(`Token loaded: ${token ? (token.substring(0, 10) + '...') : 'NONE'}`);

    if (!token) {
        console.error("❌ ERROR: MP_ACCESS_TOKEN is missing in .env");
        return;
    }

    if (!token.startsWith("TEST-")) {
        console.warn("⚠️  WARNING: Token does not start with 'TEST-'. Are you using Production credentials?");
    }

    mercadopago.configurations.setAccessToken(token);

    try {
        // Try to create a dummy preference to validate token
        const result = await mercadopago.preferences.create({
            items: [
                {
                    title: 'Test Item',
                    unit_price: 100,
                    quantity: 1,
                }
            ]
        });

        console.log("✅ SUCCESS: Token is valid!");
        console.log(`Preference ID created: ${result.body.id}`);
    } catch (error) {
        console.error("❌ FAILURE: Token rejected by Mercado Pago.");
        console.error(`Status: ${error.status}`);
        console.error(`Message: ${error.message}`);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

testToken();
