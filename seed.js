require('dotenv').config();
const mongoose = require('mongoose');
const LocalRegistration = require('./models/Registration');
const MongoRegistration = require('./models/RegistrationMongo');
const LocalEvent = require('./models/EventLocal');
const MongoEvent = require('./models/EventMongo');

const seedEvents = [
  {
    title: 'Mindcraft Grand Hackathon',
    slug: 'mindcraft-grand-hackathon',
    summary: '24-hour build sprint for product, AI, and sustainability ideas.',
    description: 'Build a prototype with your team, get mentored by industry experts, and pitch to the jury on demo day.',
    category: 'Hackathon',
    location: 'Innovation Arena, Chennai',
    startAt: '2026-05-10T09:00:00.000Z',
    endAt: '2026-05-11T09:00:00.000Z',
    capacity: 280,
    heroImage: '',
    published: true
  },
  {
    title: 'Applied AI Workshop',
    slug: 'applied-ai-workshop',
    summary: 'Hands-on workshop on production-grade GenAI workflows.',
    description: 'From prompt strategy to model evaluation, learn to build and ship practical AI features safely.',
    category: 'Workshop',
    location: 'Knowledge Hall B, Chennai',
    startAt: '2026-05-14T10:00:00.000Z',
    endAt: '2026-05-14T16:30:00.000Z',
    capacity: 160,
    heroImage: '',
    published: true
  },
  {
    title: 'Robotics Challenge Finals',
    slug: 'robotics-challenge-finals',
    summary: 'Autonomous robotics showdown with live scoring.',
    description: 'Teams compete in navigation, object handling, and speed rounds before a live audience.',
    category: 'Robotics',
    location: 'Tech Stadium, Chennai',
    startAt: '2026-05-20T08:00:00.000Z',
    endAt: '2026-05-20T18:00:00.000Z',
    capacity: 220,
    heroImage: '',
    published: true
  }
];

const seedData = [
  {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    college: 'Mindcraft Institute',
    event: 'Mindcraft Grand Hackathon'
  },
  {
    name: 'Meera Nair',
    email: 'meera.nair@example.com',
    phone: '9123456780',
    college: 'Tech Valley University',
    event: 'Applied AI Workshop'
  },
  {
    name: 'Rohan Iyer',
    email: 'rohan.iyer@example.com',
    phone: '9988776655',
    college: 'Future Labs College',
    event: 'Robotics Challenge Finals'
  }
];

async function seedMongo(mongoUri) {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  const eventCount = await MongoEvent.countDocuments();
  if (eventCount === 0) {
    await MongoEvent.insertMany(seedEvents);
  }

  const events = await MongoEvent.find().lean();
  const eventMap = events.reduce((acc, item) => {
    acc[item.title] = item._id;
    return acc;
  }, {});

  const count = await MongoRegistration.countDocuments();

  if (count > 0) {
    console.log('Mongo seed skipped: existing records found.');
    return;
  }

  await MongoRegistration.insertMany(seedData.map(item => ({ ...item, eventId: eventMap[item.event] })));
  console.log(`Mongo seed inserted: ${seedData.length} records.`);
}

async function seedLocal() {
  const eventCount = await LocalEvent.count({});
  if (eventCount === 0) {
    await LocalEvent.insert(seedEvents.map(item => ({ ...item, createdAt: new Date() })));
  }

  const events = await LocalEvent.find({});
  const eventMap = events.reduce((acc, item) => {
    acc[item.title] = item._id;
    return acc;
  }, {});

  const count = await LocalRegistration.count({});
  if (count > 0) {
    console.log('Local seed skipped: existing records found.');
    return;
  }

  await LocalRegistration.insert(seedData.map(item => ({ ...item, eventId: eventMap[item.event], createdAt: new Date() })));
  console.log(`Local seed inserted: ${seedData.length} records.`);
}

(async () => {
  try {
    const mongoUri = (process.env.MONGO_URI || '').trim();
    const hasValidMongoUri = /^mongodb(\+srv)?:\/\//.test(mongoUri);

    if (hasValidMongoUri) {
      await seedMongo(mongoUri);
    } else {
      await seedLocal();
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
