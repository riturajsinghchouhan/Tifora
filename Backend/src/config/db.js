import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('autoCreate', false);

const configureDnsServers = () => {
    const rawDnsServers = process.env.MONGODB_DNS_SERVERS;

    if (!rawDnsServers) {
        return;
    }

    const servers = rawDnsServers
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);

    if (servers.length === 0) {
        return;
    }

    try {
        dns.setServers(servers);
        logger.info(`MongoDB DNS override enabled with ${servers.length} server(s) from MONGODB_DNS_SERVERS`);
    } catch (error) {
        logger.warn(`Failed to apply MONGODB_DNS_SERVERS override: ${error.message}`);
    }
};

export const connectDB = async () => {
    try {
        configureDnsServers();
        const conn = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 100,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        });
        logger.info(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Close MongoDB connection (e.g. graceful shutdown).
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
};
