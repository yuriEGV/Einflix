import dotenv from 'dotenv';
dotenv.config();

async function finalVerify() {
    const token = "TEST-2354123145522796-122308-1adfdd1800556735e92afcd8ce1a7637-235326405";
    console.log(`Testing Hardcoded Token: ${token.substring(0, 20)}...`);

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{ title: 'Test', quantity: 1, unit_price: 100, currency_id: 'CLP' }]
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("✅ SUCCESS! The token works perfect.");
        } else {
            console.log(`❌ FAILED: ${response.status} - ${data.message}`);
        }
    } catch (e) {
        console.error(e);
    }
}
finalVerify();
