import mongoose from 'mongoose';

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/tifora');
    const { TiffinDelivery } = await import('./src/modules/food/tiffin/models/tiffinDelivery.model.js');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    console.log('Today (local node timezone):', today.toISOString(), 'Tomorrow:', tomorrow.toISOString());
    
    const deliveries = await TiffinDelivery.find({ date: { $gte: today, $lt: tomorrow } });
    console.log('Deliveries today:', deliveries.length);
    if (deliveries.length > 0) {
        console.log('Sample delivery date:', deliveries[0].date);
        console.log('Sample delivery status:', deliveries[0].status);
    }
    process.exit(0);
}

run().catch(console.error);
