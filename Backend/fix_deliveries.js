import mongoose from 'mongoose';

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/tifora');
    const { TiffinSubscription } = await import('./src/modules/food/tiffin/models/tiffinSubscription.model.js');
    const { TiffinDelivery } = await import('./src/modules/food/tiffin/models/tiffinDelivery.model.js');
    const { TiffinPlan } = await import('./src/modules/food/tiffin/models/tiffinPlan.model.js');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeSubs = await TiffinSubscription.find({ status: 'active' });
    console.log('Active subscriptions found:', activeSubs.length);

    let created = 0;
    for (const sub of activeSubs) {
        const plan = await TiffinPlan.findById(sub.planId);
        if (!plan) {
            console.log('Plan not found for sub:', sub._id);
            continue;
        }

        const mealTypes = plan.mealType === 'Both' ? ['Morning', 'Evening'] : [plan.mealType];
        console.log(`Sub ${sub._id} requires ${mealTypes.join(', ')}`);
        
        for (const type of mealTypes) {
            const exists = await TiffinDelivery.findOne({
                subscriptionId: sub._id,
                date: { $gte: today, $lt: tomorrow },
                type
            });

            if (!exists) {
                await TiffinDelivery.create({
                    subscriptionId: sub._id,
                    restaurantId: sub.restaurantId,
                    userId: sub.userId,
                    deliveryAddress: sub.deliveryAddress,
                    type,
                    date: today,
                    status: 'pending'
                });
                created++;
            }
        }
    }
    console.log('Created missing deliveries:', created);
    process.exit(0);
}

run().catch(console.error);
