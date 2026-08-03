import mongoose from 'mongoose';

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/tifora');
    const { TiffinDelivery } = await import('./src/modules/food/tiffin/models/tiffinDelivery.model.js');
    
    const result = await TiffinDelivery.updateMany({}, { $set: { status: 'pending', assignedTo: null } });
    console.log('Updated deliveries:', result.modifiedCount);
    process.exit(0);
}

run().catch(console.error);
