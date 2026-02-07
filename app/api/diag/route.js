import { NextResponse } from 'next/server';
import { getAllDriveClients, decryptId, encryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let clients = [];
        try {
            clients = await getAllDriveClients();
        } catch (e) {
            console.error("[Diag] getAllDriveClients failed:", e.message);
        }

        // Check encryption
        let encryptionOk = false;
        let encrypted = "error";
        let decrypted = "error";
        try {
            const testId = "drive-id-12345";
            encrypted = encryptId(testId) || "failed";
            decrypted = decryptId(encrypted) || "failed";
            encryptionOk = (testId === decrypted);
        } catch (e) {
            console.error("[Diag] Encryption test failed:", e.message);
        }

        // Check if using default key
        const keyRaw = process.env.ID_ENCRYPTION_KEY || 'einflix_super_secret_id_key_2024';
        const isDefaultKey = !process.env.ID_ENCRYPTION_KEY || process.env.ID_ENCRYPTION_KEY === 'einflix_super_secret_id_key_2024';

        // Key Fingerprint (first 4 and last 4 chars)
        const keyFingerprint = keyRaw ? `${keyRaw.toString().slice(0, 4)}...${keyRaw.toString().slice(-4)}` : 'missing';

        const detectedKeys = [];
        for (let i = 1; i <= 10; i++) {
            if (process.env[`GOOGLE_SERVICE_ACCOUNT_KEY_${i}`]) {
                detectedKeys.push(`KEY_${i}`);
            }
        }

        return NextResponse.json({
            status: 'ok',
            diagnostic: {
                encryption: {
                    status: encryptionOk ? 'passed' : 'failed',
                    key_source: isDefaultKey ? 'DEFAULT (Shared)' : 'CUSTOM (Private)',
                    key_fingerprint: keyFingerprint,
                    test_match: encryptionOk,
                    encrypted_sample: encrypted ? encrypted.toString().slice(0, 15) + '...' : 'null'
                },
                drive_accounts: {
                    count: (clients || []).length,
                    details: (clients || []).map(c => ({
                        source: c?.source || 'unknown',
                        email: c?.email ? (c.email.toString().slice(0, 5) + '...' + c.email.toString().slice(-10)) : 'unknown'
                    }))
                },
                env_keys_detected: detectedKeys
            }
        });
    } catch (error) {
        console.error("[Diag Route] Global Catch:", error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack?.slice(0, 100)
        }, { status: 500 });
    }
}
