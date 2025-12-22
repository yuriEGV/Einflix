import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    console.log('[MongoDB] dbConnect called');
    if (cached.conn) {
        console.log('[MongoDB] Using cached connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        console.log('[MongoDB] Linking new connection...');
        console.log('[MongoDB] URI:', MONGO_URI ? MONGO_URI.substring(0, 10) + '...' : 'UNDEFINED');

        cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
            console.log('[MongoDB] Connection promise resolved');
            return mongoose;
        }).catch(err => {
            console.error('[MongoDB] Connection promise REJECTED:', err);
            throw err;
        });
    }

    try {
        console.log('[MongoDB] Awaiting connection...');
        cached.conn = await cached.promise;
        console.log('[MongoDB] Connection established');
    } catch (e) {
        console.error('[MongoDB] Connection FAILED in await:', e);
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
