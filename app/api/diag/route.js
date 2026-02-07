import { NextResponse } from 'next/server';
import { getAllDriveClients, decryptId, encryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const clients = await getAllDriveClients();

        // Check encryption
        const testId = "drive-id-12345";
        const encrypted = encryptId(testId);
        const decrypted = decryptId(encrypted);
        const encryptionOk = (testId === decrypted);

        // Check if using default key
        const isDefaultKey = !process.env.ID_ENCRYPTION_KEY || process.env.ID_ENCRYPTION_KEY === 'einflix_super_secret_id_key_2024';

        return NextResponse.json({
            status: 'ok',
            diagnostic: {
                encryption: {
                    status: encryptionOk ? 'passed' : 'failed',
                    key_source: isDefaultKey ? 'DEFAULT (Shared)' : 'CUSTOM (Private)',
                    test_match: encryptionOk,
                    encrypted_sample: encrypted.slice(0, 15) + '...'
                },
                drive_accounts: {
                    count: clients.length,
                    details: clients.map(c => ({
                        source: c.source,
                        email: c.email ? (c.email.slice(0, 5) + '...' + c.email.slice(-10)) : 'unknown'
                    }))
                },
                env_keys_detected: Array.from({ length: 10 }, (_, i) => i + 1)
                    .filter(i => !!process.env[`GOOGLE_SERVICE_ACCOUNT_KEY_${i}`])
                    .map(i => `KEY_${i}`)
            }
        });
    } catch (error) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
