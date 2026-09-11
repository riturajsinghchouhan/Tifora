import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const rests = await mongoose.connection.collection('food_restaurants').find({}).toArray();
  console.log('--- RESTAURANTS ---');
  rests.forEach(r => console.log(r._id.toString(), '|', r.restaurantName, '| Phone:', r.ownerPhone));

  const items = await mongoose.connection.collection('food_items').find({}).toArray();
  console.log('\n--- FOOD ITEMS ---');
  items.forEach(i => console.log(i._id.toString(), '|', i.name, '| restId:', i.restaurantId?.toString()));

  const users = await mongoose.connection.collection('users').find({ role: 'restaurant' }).toArray();
  console.log('\n--- RESTAURANT USERS ---');
  users.forEach(u => console.log(u._id.toString(), '|', u.name, '| Phone:', u.phone, '| role:', u.role));

  process.exit(0);
}

check();
