import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load envs
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyRaw() {
    const token = process.env.MP_ACCESS_TOKEN;
    console.log(`\nTesting Token: ${token ? token.substring(0, 15) + '...' : 'NONE'}`);

    if (!token) {
        console.error("No token found");
        return;
    }

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [
                    {
                        title: 'Test Raw',
                        quantity: 1,
                        currency_id: 'CLP',
                        unit_price: 100
                    }
                ]
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ SUCCESS! Token is valid.");
            console.log("Preference ID:", data.id);
        } else {
            console.error("❌ FAILED. API rejected the token.");
            console.error("Status:", response.status);
            console.error("Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Network Error:", error);
    }
}

verifyRaw();
