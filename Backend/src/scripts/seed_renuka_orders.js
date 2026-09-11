import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function seedOrders() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const foodOrdersColl = mongoose.connection.collection('food_orders');
    const foodTxColl = mongoose.connection.collection('food_transactions');
    const foodRestColl = mongoose.connection.collection('food_restaurants');
    const foodItemsColl = mongoose.connection.collection('food_items');

    // Find target restaurant: Renuka's Kitchen (9755633147)
    const restaurant = await foodRestColl.findOne({
        $or: [
            { ownerPhone: '9755633147' },
            { _id: new mongoose.Types.ObjectId('6aa3ece238de15dd42c82a53') }
        ]
    });

    if (!restaurant) {
        console.error('❌ Restaurant Renuka\'s Kitchen (9755633147) not found in DB!');
        process.exit(1);
    }

    const restaurantId = restaurant._id;
    console.log(`📍 Found Restaurant: ${restaurant.restaurantName} (ID: ${restaurantId})`);

    // Find or create a dummy user
    let user = await mongoose.connection.collection('users').findOne({ phone: '9876543299' });
    if (!user) {
        const userRes = await mongoose.connection.collection('users').insertOne({
            name: 'Aman Sharma',
            phone: '9876543299',
            email: 'aman.sharma@example.com',
            role: 'user',
            createdAt: new Date()
        });
        user = { _id: userRes.insertedId, name: 'Aman Sharma', phone: '9876543299' };
    }
    const userId = user._id;

    // Get menu items for this restaurant to populate realistic order items
    const menuItems = await foodItemsColl.find({ restaurantId }).toArray();
    const defaultItem = menuItems[0] || {
        _id: new mongoose.Types.ObjectId(),
        name: 'Special Homely Lunch / Dinner Thali',
        price: 120
    };

    // Define 8 dummy orders matching each tab status
    const dummyOrdersSpec = [
        {
            tab: 'New',
            orderId: 'ORD-9001',
            orderStatus: 'created',
            itemName: menuItems[0]?.name || 'Special Homely Lunch / Dinner Thali',
            price: menuItems[0]?.price || 120,
            quantity: 2,
            customerName: 'Aman Sharma',
            phone: '9876543299',
            scheduledAt: null
        },
        {
            tab: 'Preparing',
            orderId: 'ORD-9002',
            orderStatus: 'preparing',
            itemName: menuItems[1]?.name || 'Deluxe Royal Executive Thali',
            price: menuItems[1]?.price || 180,
            quantity: 1,
            customerName: 'Priya Verma',
            phone: '9876543298',
            scheduledAt: null
        },
        {
            tab: 'Ready',
            orderId: 'ORD-9003',
            orderStatus: 'ready_for_pickup',
            itemName: menuItems[2]?.name || 'Indori Sev Tamatar Ki Sabzi',
            price: menuItems[2]?.price || 110,
            quantity: 2,
            customerName: 'Vikram Singh',
            phone: '9876543297',
            scheduledAt: null
        },
        {
            tab: 'Out for delivery',
            orderId: 'ORD-9004',
            orderStatus: 'picked_up',
            itemName: menuItems[3]?.name || 'Paneer Butter Masala (300ml)',
            price: menuItems[3]?.price || 160,
            quantity: 1,
            customerName: 'Rahul Mehta',
            phone: '9876543296',
            scheduledAt: null,
            dispatchStatus: 'accepted'
        },
        {
            tab: 'Scheduled',
            orderId: 'ORD-9005',
            orderStatus: 'confirmed',
            itemName: menuItems[4]?.name || 'Homestyle Dal Tadka Jeera Rice Combo',
            price: menuItems[4]?.price || 130,
            quantity: 2,
            customerName: 'Sneha Patel',
            phone: '9876543295',
            scheduledAt: new Date(Date.now() + 24 * 3600 * 1000) // Tomorrow
        },
        {
            tab: 'Completed',
            orderId: 'ORD-9006',
            orderStatus: 'delivered',
            itemName: menuItems[5]?.name || 'Tawa Butter Phulka (Pack of 4)',
            price: menuItems[5]?.price || 40,
            quantity: 3,
            customerName: 'Karan Gupta',
            phone: '9876543294',
            scheduledAt: null
        },
        {
            tab: 'Cancelled',
            orderId: 'ORD-9007',
            orderStatus: 'cancelled_by_restaurant',
            itemName: menuItems[0]?.name || 'Special Homely Lunch / Dinner Thali',
            price: menuItems[0]?.price || 120,
            quantity: 1,
            customerName: 'Neha Joshi',
            phone: '9876543293',
            scheduledAt: null
        },
        {
            tab: 'Dead Orders',
            orderId: 'ORD-9008',
            orderStatus: 'dead',
            itemName: menuItems[1]?.name || 'Deluxe Royal Executive Thali',
            price: menuItems[1]?.price || 180,
            quantity: 1,
            customerName: 'Deepak Tiwari',
            phone: '9876543292',
            scheduledAt: null
        }
    ];

    for (const spec of dummyOrdersSpec) {
        const itemTotal = spec.price * spec.quantity;
        const total = itemTotal + 40; // include delivery fee

        // Check if order already exists
        let orderDoc = await foodOrdersColl.findOne({
            restaurantId,
            orderId: spec.orderId
        });

        const orderPayload = {
            order_id: spec.orderId,
            orderId: spec.orderId,
            userId,
            restaurantId,
            items: [
                {
                    itemId: String(menuItems[0]?._id || new mongoose.Types.ObjectId()),
                    name: spec.itemName,
                    price: spec.price,
                    quantity: spec.quantity,
                    isVeg: true,
                    image: '/uploads/food/items/food_022aa488.webp'
                }
            ],
            deliveryAddress: {
                label: 'Home',
                name: spec.customerName,
                fullName: spec.customerName,
                street: 'Scheme No 54, Vijay Nagar',
                city: 'Indore',
                state: 'Madhya Pradesh',
                zipCode: '452010',
                phone: spec.phone,
                location: { type: 'Point', coordinates: [75.8937, 22.7533] }
            },
            customerName: spec.customerName,
            customerPhone: spec.phone,
            orderStatus: spec.orderStatus,
            scheduledAt: spec.scheduledAt,
            pricing: {
                subtotal: itemTotal,
                tax: 0,
                packagingFee: 0,
                deliveryFee: 40,
                platformFee: 5,
                discount: 0,
                total
            },
            paymentMethod: 'cash',
            dispatch: {
                modeAtCreation: 'auto',
                status: spec.dispatchStatus || 'unassigned'
            },
            deliveryState: {
                currentPhase: spec.orderStatus === 'delivered' ? 'completed' : 'en_route_to_pickup'
            },
            updatedAt: new Date()
        };

        let mongoOrderId;
        if (orderDoc) {
            await foodOrdersColl.updateOne({ _id: orderDoc._id }, { $set: orderPayload });
            mongoOrderId = orderDoc._id;
            console.log(`🔄 Updated order ${spec.orderId} [${spec.tab}]`);
        } else {
            const res = await foodOrdersColl.insertOne({ ...orderPayload, createdAt: new Date() });
            mongoOrderId = res.insertedId;
            console.log(`✅ Created order ${spec.orderId} [${spec.tab}]`);
        }

        // Check if FoodTransaction exists for this order
        let txDoc = await foodTxColl.findOne({ orderId: mongoOrderId });
        const txPayload = {
            orderId: mongoOrderId,
            userId,
            restaurantId,
            paymentMethod: 'cash',
            status: 'captured',
            currency: 'INR',
            pricing: {
                subtotal: itemTotal,
                tax: 0,
                packagingFee: 0,
                deliveryFee: 40,
                platformFee: 5,
                discount: 0,
                total
            },
            payment: {
                method: 'cash',
                status: 'captured',
                amountDue: 0
            },
            amounts: {
                totalCustomerPaid: total,
                restaurantShare: itemTotal,
                restaurantCommission: 0,
                gstOnItem: 0,
                gstOnCommission: 0,
                paymentGatewayFee: 0,
                tcs: 0,
                riderShare: 40,
                platformNetProfit: 5,
                taxAmount: 0
            },
            orderSnapshot: {
                orderDisplayId: spec.orderId,
                userId,
                restaurantId,
                items: [
                    {
                        itemId: String(menuItems[0]?._id || new mongoose.Types.ObjectId()),
                        name: spec.itemName,
                        price: spec.price,
                        quantity: spec.quantity
                    }
                ],
                deliveryAddress: {
                    label: 'Home',
                    name: spec.customerName,
                    fullName: spec.customerName,
                    street: 'Scheme No 54, Vijay Nagar',
                    city: 'Indore',
                    state: 'Madhya Pradesh',
                    zipCode: '452010',
                    phone: spec.phone
                },
                pricing: {
                    subtotal: itemTotal,
                    total
                },
                paymentMethod: 'cash',
                orderStatus: spec.orderStatus,
                createdAt: new Date()
            },
            updatedAt: new Date()
        };

        if (txDoc) {
            await foodTxColl.updateOne({ _id: txDoc._id }, { $set: txPayload });
        } else {
            await foodTxColl.insertOne({ ...txPayload, createdAt: new Date() });
        }
    }

    console.log('\n=============================================');
    console.log('🎉 8 DUMMY ORDERS SUCCESSFULLY SEEDED FOR RENUKA\'S KITCHEN!');
    console.log(`Restaurant ID: ${restaurantId} (Phone: 9755633147)`);
    console.log('Tabs covered: New, Preparing, Ready, Out for delivery, Scheduled, Completed, Cancelled, Dead Orders');
    console.log('=============================================\n');

    process.exit(0);
}

seedOrders();
