import mongoose from 'mongoose';
import { TiffinPlan } from '../modules/food/tiffin/models/tiffinPlan.model.js';
import { TiffinSubscription } from '../modules/food/tiffin/models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../modules/food/tiffin/models/tiffinDelivery.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tifora';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for Tiffin Seeding');

    const restaurantId = new mongoose.Types.ObjectId('6a6e2741189263f779c76706'); // Renuka's kitchen
    const partnerId = new mongoose.Types.ObjectId('6a6e2743189263f779c76745'); // ritu (9876543211)
    
    // Find or create a user
    let user = await mongoose.connection.collection('users').findOne({ phone: '9876543210' });
    if (!user) {
        user = await mongoose.connection.collection('users').findOne({});
    }
    const userId = user?._id || new mongoose.Types.ObjectId('6a6e2741189263f779c76701');

    // Create or find a Tiffin Plan
    let plan = await TiffinPlan.findOne({ restaurantId });
    if (!plan) {
        plan = await TiffinPlan.create({
            restaurantId,
            name: 'Homestyle Deluxe Thali Plan',
            durationDays: 30,
            mealType: 'Morning',
            price: 2999,
            itemsDescription: '4 Butter Roti, Dal Tadka, Paneer Sabzi, Jeera Rice, Salad',
            isVegetarian: true,
            isActive: true,
            items: [
                { name: 'Butter Roti', quantity: '4 Pcs' },
                { name: 'Dal Tadka', quantity: '1 Bowl' },
                { name: 'Paneer Butter Masala', quantity: '1 Bowl' },
                { name: 'Jeera Rice', quantity: '1 Bowl' },
                { name: 'Green Salad', quantity: '1 Portion' }
            ]
        });
        console.log('Created Plan:', plan.name);
    }

    // Create a subscription
    let subscription = await TiffinSubscription.findOne({ restaurantId, userId });
    if (!subscription) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        subscription = await TiffinSubscription.create({
            userId,
            restaurantId,
            planId: plan._id,
            startDate,
            endDate,
            amountPaid: 2999,
            status: 'active',
            deliveryAddress: {
                label: 'Home',
                name: 'Rituraj Singh Chouhan',
                fullName: 'Rituraj Singh Chouhan',
                street: 'Flat 302, Royal Palms, Silicon City',
                area: 'Silicon City',
                landmark: 'Near Gamle Wali Puliya Gate 2',
                zone: 'Silicon City - Gamle Wali Puliya',
                city: 'Indore',
                state: 'Madhya Pradesh',
                zipCode: '452012',
                location: { type: 'Point', coordinates: [75.8577, 22.7196] }
            }
        });
        console.log('Created Subscription:', subscription._id);
    }

    // Clear existing deliveries for today to avoid stale test duplicates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await TiffinDelivery.deleteMany({ date: { $gte: today, $lt: tomorrow } });

    // Seed 3 realistic multi-zone deliveries assigned to rider "ritu"
    const deliveriesData = [
        {
            subscriptionId: subscription._id,
            restaurantId,
            userId,
            type: 'Morning',
            date: new Date(),
            status: 'assigned',
            assignedTo: partnerId,
            assignedAt: new Date(),
            deliveryAddress: {
                location: { type: 'Point', coordinates: [75.8580, 22.7200] },
                fullAddress: 'Flat 302, Royal Palms, Silicon City, Indore',
                phone: '9876543210',
                name: 'Rituraj Singh Chouhan',
                area: 'Silicon City',
                landmark: 'Near Gamle Wali Puliya Gate 2',
                zone: 'Silicon City - Gamle Wali Puliya'
            },
            verification: {
                otpRequired: true,
                isVerified: false
            }
        },
        {
            subscriptionId: subscription._id,
            restaurantId,
            userId,
            type: 'Morning',
            date: new Date(),
            status: 'assigned',
            assignedTo: partnerId,
            assignedAt: new Date(),
            deliveryAddress: {
                location: { type: 'Point', coordinates: [75.8650, 22.7250] },
                fullAddress: 'Villa 14, Silver Springs Phase 1, Bypass Road, Indore',
                phone: '9826011223',
                name: 'Anjali Sharma',
                area: 'Silver Springs',
                landmark: 'Opposite Clubhouse Garden',
                zone: 'Silver Springs - Bypass'
            },
            verification: {
                otpRequired: true,
                isVerified: false
            }
        },
        {
            subscriptionId: subscription._id,
            restaurantId,
            userId,
            type: 'Morning',
            date: new Date(),
            status: 'assigned',
            assignedTo: partnerId,
            assignedAt: new Date(),
            deliveryAddress: {
                location: { type: 'Point', coordinates: [75.8750, 22.7350] },
                fullAddress: 'A-401, Treasure Fantasy, CAT Road, Indore',
                phone: '9893044556',
                name: 'Vikram Mehta',
                area: 'Treasure Fantasy',
                landmark: 'Near Main Security Post',
                zone: 'Treasure Fantasy - CAT Road'
            },
            verification: {
                otpRequired: true,
                isVerified: false
            }
        }
    ];

    const createdDeliveries = await TiffinDelivery.insertMany(deliveriesData);
    console.log(`✅ Successfully seeded ${createdDeliveries.length} assigned tiffin deliveries for today!`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
