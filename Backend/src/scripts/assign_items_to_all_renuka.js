import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function assignItems() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const foodItemsColl = mongoose.connection.collection('food_items');
  const foodCatColl = mongoose.connection.collection('food_categories');
  const foodRestColl = mongoose.connection.collection('food_restaurants');

  // Find all restaurants matching Renuka
  const renukaRestaurants = await foodRestColl.find({
    restaurantName: { $regex: /renuka/i }
  }).toArray();

  console.log(`Found ${renukaRestaurants.length} Renuka restaurants:`);
  renukaRestaurants.forEach(r => console.log(`- ID: ${r._id}, Name: ${r.restaurantName}, Phone: ${r.ownerPhone}`));

  // Categories data template
  const categoriesData = [
    { name: "Tiffin & Daily Thalis", type: "Tiffin", foodTypeScope: "Veg", sortOrder: 1 },
    { name: "Main Course & Sabzi", type: "Main Course", foodTypeScope: "Veg", sortOrder: 2 },
    { name: "Dal, Rice & Combos", type: "Combos", foodTypeScope: "Veg", sortOrder: 3 },
    { name: "Breads & Extras", type: "Breads", foodTypeScope: "Veg", sortOrder: 4 },
  ];

  // Menu items template
  const itemsData = [
    {
      name: "Special Homely Lunch / Dinner Thali",
      categoryName: "Tiffin & Daily Thalis",
      description: "4 Hot Ghee Phulka Rotis, Homestyle Dal Tadka, Seasonal Green Sabzi, Steamed Basmati Rice, Fresh Salad & Achar.",
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

  for (const rest of renukaRestaurants) {
    console.log(`\nProcessing restaurant: ${rest.restaurantName} (ID: ${rest._id})`);

    // Ensure status is approved
    await foodRestColl.updateOne(
      { _id: rest._id },
      { $set: { status: 'approved', isAcceptingOrders: true, approvedAt: new Date() } }
    );

    const categoryMap = {};
    for (const cat of categoriesData) {
      let catDoc = await foodCatColl.findOne({
        restaurantId: rest._id,
        name: cat.name
      });
      if (!catDoc) {
        const insertRes = await foodCatColl.insertOne({
          ...cat,
          restaurantId: rest._id,
          createdByRestaurantId: rest._id,
          isApproved: true,
          approvalStatus: 'approved',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        catDoc = { _id: insertRes.insertedId, name: cat.name };
      }
      categoryMap[cat.name] = catDoc;
    }

    for (const item of itemsData) {
      const cat = categoryMap[item.categoryName];
      const existingItem = await foodItemsColl.findOne({
        restaurantId: rest._id,
        name: item.name
      });

      const payload = {
        ...item,
        restaurantId: rest._id,
        categoryId: cat ? cat._id : undefined,
        updatedAt: new Date()
      };

      if (existingItem) {
        await foodItemsColl.updateOne({ _id: existingItem._id }, { $set: payload });
      } else {
        await foodItemsColl.insertOne({ ...payload, createdAt: new Date() });
      }
    }
    console.log(`✅ Seeded food items for restaurant ID ${rest._id}`);
  }

  console.log('\n🎉 ALL RENUKA RESTAURANTS UPDATED WITH FOOD ITEMS SUCCESSFULLY!');
  process.exit(0);
}

assignItems();
