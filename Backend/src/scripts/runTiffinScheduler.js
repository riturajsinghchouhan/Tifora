import { generateDailyDeliveries } from '../modules/food/tiffin/scripts/tiffinScheduler.js';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

const run = async () => {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to DB');
        await generateDailyDeliveries();
        console.log('Done');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
