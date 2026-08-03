import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tifora', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to DB');
    const { TiffinSubscription } = await import('./src/modules/food/tiffin/models/tiffinSubscription.model.js');
    const subs = await TiffinSubscription.find().sort({ createdAt: -1 }).lean();
    console.log('Total subscriptions:', subs.length);
    if(subs.length > 0) {
        console.log('Last sub:', subs.slice(0, 2));
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
