import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mercadopago from 'mercadopago';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load envs
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("\n=== SYSTEM DIAGNOSIS ===\n");

async function check() {
    let hasError = false;

    // 1. Check MongoDB URI
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MongoDB: URI Missing (MONGODB_URI or MONGO_URI)");
        hasError = true;
    } else {
        try {
            await mongoose.connect(mongoUri);
            console.log("✅ MongoDB: Connection Successful");
            await mongoose.disconnect();
        } catch (e) {
            console.error(`❌ MongoDB: Connection Failed -> ${e.message}`);
            hasError = true;
        }
    }

    // 2. Check Email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ Email: Credentials Missing (EMAIL_USER or EMAIL_PASS)");
        hasError = true;
    } else {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        try {
            await transporter.verify();
            console.log("✅ Email: Auth Successful");
        } catch (e) {
            console.error(`❌ Email: Auth Failed -> ${e.message}`);
            console.error("   (Did you generate an App Password?)");
            hasError = true;
        }
    }

    // 3. Check Mercado Pago
    if (!process.env.MP_ACCESS_TOKEN) {
        console.error("❌ MercadoPago: Token Missing (MP_ACCESS_TOKEN)");
        hasError = true;
    } else {
        if (!process.env.MP_ACCESS_TOKEN.startsWith("TEST-")) {
            console.warn("⚠️  MercadoPago: Token does not look like a TEST token (should start with TEST-)");
        }
        console.log("✅ MercadoPago: Token Present");
    }

    console.log("\n========================\n");
    if (hasError) {
        console.log("⚠️  FIX ERRORS IN .env AND RESTART SERVER");
        process.exit(1);
    } else {
        console.log("🎉 ALL SYSTEMS GO! Restart your server now.");
        process.exit(0);
    }
}

check();
