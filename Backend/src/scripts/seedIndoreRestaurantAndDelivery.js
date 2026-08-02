import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { FoodZone } from '../modules/food/admin/models/zone.model.js';
import { FoodRestaurant } from '../modules/food/restaurant/models/restaurant.model.js';
import { FoodRestaurantWallet } from '../modules/food/restaurant/models/restaurantWallet.model.js';
import { FoodCategory } from '../modules/food/admin/models/category.model.js';
import { FoodItem } from '../modules/food/admin/models/food.model.js';
import { FoodDeliveryPartner } from '../modules/food/delivery/models/deliveryPartner.model.js';
import { FoodDeliveryWallet } from '../modules/food/delivery/models/deliveryWallet.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in Backend .env');
  process.exit(1);
}

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Ensure Indore Zone
    let indoreZone = await FoodZone.findOne({ name: /Indore/i });
    if (!indoreZone) {
      console.log('📍 Creating Indore Zone...');
      indoreZone = await FoodZone.create({
        name: 'Indore',
        zoneName: 'Indore',
        country: 'India',
        serviceLocation: 'Indore',
        unit: 'kilometer',
        coordinates: [
          { latitude: 22.569282, longitude: 75.677803 },
          { latitude: 22.57055, longitude: 76.157082 },
          { latitude: 22.88468, longitude: 76.093911 },
          { latitude: 22.861921, longitude: 75.657204 },
        ],
        isActive: true,
      });
      console.log(`✅ Created Indore Zone: ${indoreZone._id}`);
    } else {
      console.log(`✅ Using existing Indore Zone: ${indoreZone._id} (${indoreZone.name})`);
    }

    // 2. Seed Restaurant: Renuka's kitchen
    const restaurantPhone = '9876543210';
    let restaurant = await FoodRestaurant.findOne({
      $or: [
        { restaurantName: "Renuka's kitchen" },
        { ownerPhone: restaurantPhone },
      ],
    });

    const restaurantData = {
      restaurantName: "Renuka's kitchen",
      ownerName: "Renuka Sharma",
      ownerPhone: restaurantPhone,
      ownerEmail: "renuka@kitchen.com",
      primaryContactNumber: restaurantPhone,
      pureVegRestaurant: true,
      addressLine1: "Scheme No 54, Near Meghdoot Garden",
      area: "Vijay Nagar",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      landmark: "Near Vijay Nagar Square",
      cuisines: ["North Indian", "Home Food", "Tiffin Service", "Thali", "Indori Special"],
      openingTime: "08:00",
      closingTime: "23:00",
      openDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      isAcceptingOrders: true,
      profileImage: "/uploads/food/restaurants/profile/anckhooqqhscy8n2co3r.webp",
      coverImages: ["/uploads/food/landing/fest-banner/img_376e54c5.webp"],
      location: {
        type: "Point",
        coordinates: [75.8937, 22.7533], // [lng, lat] for Vijay Nagar Indore
        latitude: 22.7533,
        longitude: 75.8937,
        address: "Scheme No 54, Vijay Nagar, Indore, Madhya Pradesh",
        area: "Vijay Nagar",
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: "452010",
      },
      zoneId: indoreZone._id,
      estimatedDeliveryTime: "25-35 mins",
      estimatedDeliveryTimeMinutes: 30,
      featuredDish: "Special Homely Lunch / Dinner Tiffin",
      featuredPrice: 120,
      rating: 4.8,
      totalRatings: 128,
      status: "approved",
      approvedAt: new Date(),
    };

    if (restaurant) {
      console.log(`🔄 Updating existing restaurant "Renuka's kitchen"...`);
      Object.assign(restaurant, restaurantData);
      await restaurant.save();
    } else {
      console.log(`🍳 Creating new restaurant "Renuka's kitchen"...`);
      restaurant = await FoodRestaurant.create(restaurantData);
    }
    console.log(`✅ Restaurant "Renuka's kitchen" is ready (ID: ${restaurant._id}, Phone: ${restaurant.ownerPhone})`);

    // Ensure Restaurant Wallet
    let restWallet = await FoodRestaurantWallet.findOne({ restaurantId: restaurant._id });
    if (!restWallet) {
      restWallet = await FoodRestaurantWallet.create({
        restaurantId: restaurant._id,
        balance: 0,
        lockedAmount: 0,
        totalEarnings: 0,
        totalSettled: 0,
      });
      console.log(`✅ Initialized Restaurant Wallet`);
    }

    // 3. Seed Categories & Menu Items for Renuka's kitchen
    const categoriesData = [
      { name: "Tiffin & Daily Thalis", type: "Tiffin", foodTypeScope: "Veg", sortOrder: 1 },
      { name: "Main Course & Sabzi", type: "Main Course", foodTypeScope: "Veg", sortOrder: 2 },
      { name: "Dal, Rice & Combos", type: "Combos", foodTypeScope: "Veg", sortOrder: 3 },
      { name: "Breads & Extras", type: "Breads", foodTypeScope: "Veg", sortOrder: 4 },
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      let categoryDoc = await FoodCategory.findOne({
        name: cat.name,
        restaurantId: restaurant._id,
      });
      if (!categoryDoc) {
        categoryDoc = await FoodCategory.create({
          ...cat,
          restaurantId: restaurant._id,
          createdByRestaurantId: restaurant._id,
          zoneId: indoreZone._id,
          isApproved: true,
          approvalStatus: 'approved',
          isActive: true,
        });
      }
      categoryMap[cat.name] = categoryDoc;
    }
    console.log(`✅ Categories created/verified for Renuka's kitchen`);

    // Menu Items
    const itemsData = [
      {
        name: "Special Homely Lunch / Dinner Tiffin",
        categoryName: "Tiffin & Daily Thalis",
        description: "4 Hot Ghee Phulka Rotis, Homestyle Dal Tadka, Seasonal Green Sabzi, Steamed Basmati Rice, Fresh Salad & Achar. Freshly cooked with pure ingredients.",
        price: 120,
        foodType: "Veg",
        image: "/uploads/food/items/food_022aa488.webp",
        preparationTime: "20 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
      {
        name: "Deluxe Royal Executive Thali",
        categoryName: "Tiffin & Daily Thalis",
        description: "4 Butter Rotis, Shahi Paneer, Dal Makhani, Jeera Rice, Gulab Jamun (1 pc), Roasted Papad & Mixed Raita.",
        price: 180,
        foodType: "Veg",
        image: "/uploads/food/items/food_048753e5.webp",
        preparationTime: "25 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
      {
        name: "Indori Sev Tamatar Ki Sabzi",
        categoryName: "Main Course & Sabzi",
        description: "Authentic Indori style spicy tangy tomato gravy loaded with crunchy ratlami sev.",
        price: 110,
        foodType: "Veg",
        image: "/uploads/food/items/food_1778df16.webp",
        preparationTime: "15 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
      {
        name: "Paneer Butter Masala (300ml)",
        categoryName: "Main Course & Sabzi",
        description: "Tender cottage cheese cubes simmered in rich creamy tomato and butter gravy.",
        price: 160,
        foodType: "Veg",
        image: "/uploads/food/items/food_1304a9b9.webp",
        preparationTime: "20 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
      {
        name: "Homestyle Dal Tadka Jeera Rice Combo",
        categoryName: "Dal, Rice & Combos",
        description: "Yellow arhar dal with desi ghee garlic tadka served with fragrant jeera rice.",
        price: 130,
        foodType: "Veg",
        image: "/uploads/food/items/food_1973516b.webp",
        preparationTime: "15 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
      {
        name: "Tawa Butter Phulka (Pack of 4)",
        categoryName: "Breads & Extras",
        description: "100% whole wheat fresh soft rotis brushed with pure butter.",
        price: 40,
        foodType: "Veg",
        image: "/uploads/food/items/food_27a37665.webp",
        preparationTime: "10 mins",
        isAvailable: true,
        approvalStatus: "approved",
      },
    ];

    for (const item of itemsData) {
      const cat = categoryMap[item.categoryName];
      let itemDoc = await FoodItem.findOne({
        restaurantId: restaurant._id,
        name: item.name,
      });

      const itemPayload = {
        ...item,
        restaurantId: restaurant._id,
        categoryId: cat ? cat._id : undefined,
      };

      if (itemDoc) {
        Object.assign(itemDoc, itemPayload);
        await itemDoc.save();
      } else {
        await FoodItem.create(itemPayload);
      }
    }
    console.log(`✅ Seeded ${itemsData.length} menu items for Renuka's kitchen`);

    // 4. Seed Delivery Boy: ritu
    const deliveryPhone = '9876543211';
    let deliveryPartner = await FoodDeliveryPartner.findOne({
      $or: [
        { phone: deliveryPhone },
        { name: 'ritu' },
      ],
    });

    const deliveryData = {
      name: "ritu",
      phone: deliveryPhone,
      email: "ritu.delivery@tifora.com",
      countryCode: "+91",
      city: "Indore",
      state: "Madhya Pradesh",
      address: "Palasia Square, Indore, Madhya Pradesh",
      vehicleType: "Bike",
      vehicleName: "Honda Activa",
      vehicleNumber: "MP09AB1234",
      drivingLicenseNumber: "MP0920210012345",
      status: "approved",
      approvedAt: new Date(),
      availabilityStatus: "online",
      rating: 4.9,
      totalRatings: 95,
      lastLat: 22.7244,
      lastLng: 75.8839,
      lastLocation: {
        type: "Point",
        coordinates: [75.8839, 22.7244], // [lng, lat] for Palasia Indore
      },
      lastLocationAt: new Date(),
      shiftStartTime: new Date(),
      shiftStartAddress: "Palasia Square, Indore",
    };

    if (deliveryPartner) {
      console.log(`🔄 Updating existing delivery boy "ritu"...`);
      Object.assign(deliveryPartner, deliveryData);
      await deliveryPartner.save();
    } else {
      console.log(`🛵 Creating new delivery boy "ritu"...`);
      deliveryPartner = await FoodDeliveryPartner.create(deliveryData);
    }
    console.log(`✅ Delivery Partner "ritu" is ready (ID: ${deliveryPartner._id}, Phone: ${deliveryPartner.phone})`);

    // Ensure Delivery Wallet
    let delWallet = await FoodDeliveryWallet.findOne({ deliveryPartnerId: deliveryPartner._id });
    if (!delWallet) {
      delWallet = await FoodDeliveryWallet.create({
        deliveryPartnerId: deliveryPartner._id,
        balance: 0,
        lockedAmount: 0,
        cashInHand: 0,
        totalEarnings: 0,
        totalBonus: 0,
        totalSettled: 0,
        totalDeliveries: 0,
      });
      console.log(`✅ Initialized Delivery Partner Wallet`);
    }

    console.log('\n=============================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('📍 ZONE: Indore (ID:', indoreZone._id.toString(), ')');
    console.log('🍳 RESTAURANT:');
    console.log(`   - Name: ${restaurant.restaurantName}`);
    console.log(`   - Phone: ${restaurant.ownerPhone}`);
    console.log(`   - Location: Vijay Nagar, Indore (${restaurant.location.coordinates[1]}, ${restaurant.location.coordinates[0]})`);
    console.log(`   - Status: ${restaurant.status}, Accepting Orders: ${restaurant.isAcceptingOrders}`);
    console.log(`   - Cuisines: ${restaurant.cuisines.join(', ')}`);
    console.log('🛵 DELIVERY BOY:');
    console.log(`   - Name: ${deliveryPartner.name}`);
    console.log(`   - Phone: ${deliveryPartner.phone}`);
    console.log(`   - City: ${deliveryPartner.city}`);
    console.log(`   - Vehicle: ${deliveryPartner.vehicleName} (${deliveryPartner.vehicleNumber})`);
    console.log(`   - Status: ${deliveryPartner.status}, Availability: ${deliveryPartner.availabilityStatus}`);
    console.log(`   - Location: Palasia, Indore (${deliveryPartner.lastLat}, ${deliveryPartner.lastLng})`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
