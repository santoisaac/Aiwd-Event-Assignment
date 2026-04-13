require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const LocalRegistration = require('./models/Registration');
const MongoRegistration = require('./models/RegistrationMongo');
const LocalEvent = require('./models/EventLocal');
const MongoEvent = require('./models/EventMongo');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let activeStore = 'local';
console.log('Using local datastore at data/registrations.db');

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
  },
  {
    title: 'Product Design Sprint',
    slug: 'product-design-sprint',
    summary: 'Solve a real UX problem in one fast-paced day.',
    description: 'Research, define, and prototype user-centered solutions under mentor guidance.',
    category: 'Design',
    location: 'Studio Deck, Chennai',
    startAt: '2026-05-16T09:30:00.000Z',
    endAt: '2026-05-16T17:30:00.000Z',
    capacity: 120,
    heroImage: '',
    published: true
  }
];

const seedRegistrationRows = [
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

const mongoUri = (process.env.MONGO_URI || '').trim();
const hasValidMongoUri = /^mongodb(\+srv)?:\/\//.test(mongoUri);

if (hasValidMongoUri) {
  mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      activeStore = 'mongo';
      console.log('MongoDB Connected');
    })
    .catch(err => {
      console.log(`MongoDB connection failed: ${err.message}`);
      console.log('Falling back to local datastore at data/registrations.db');
    });
} else {
  console.log('MONGO_URI is missing or invalid; using local datastore.');
}

const usingMongo = () => activeStore === 'mongo' && mongoose.connection.readyState === 1;

const mapEventOut = (eventDoc) => ({
  ...eventDoc,
  id: String(eventDoc._id)
});

async function listEvents(filters = {}) {
  const query = {};

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    if (usingMongo()) {
      query.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { category: searchRegex },
        { location: searchRegex }
      ];
    }
  }

  if (filters.category && filters.category !== 'All') {
    query.category = filters.category;
  }

  if (usingMongo()) {
    const rows = await MongoEvent.find(query).sort({ startAt: 1 }).lean();
    return rows.map(mapEventOut);
  }

  let rows = await LocalEvent.find({});
  if (filters.category && filters.category !== 'All') {
    rows = rows.filter(item => item.category === filters.category);
  }

  if (filters.search) {
    const searchValue = filters.search.toLowerCase();
    rows = rows.filter(item => (
      `${item.title} ${item.summary} ${item.category} ${item.location}`
        .toLowerCase()
        .includes(searchValue)
    ));
  }

  return rows.sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).map(mapEventOut);
}

async function getEventById(id) {
  if (usingMongo()) {
    const row = await MongoEvent.findById(id).lean();
    return row ? mapEventOut(row) : null;
  }

  const row = await LocalEvent.findOne({ _id: id });
  return row ? mapEventOut(row) : null;
}

async function createEvent(payload) {
  if (usingMongo()) {
    const saved = await new MongoEvent(payload).save();
    return mapEventOut(saved.toObject());
  }

  const inserted = await LocalEvent.insert(payload);
  return mapEventOut(inserted);
}

async function updateEventById(id, payload) {
  if (usingMongo()) {
    const updated = await MongoEvent.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    }).lean();
    return updated ? mapEventOut(updated) : null;
  }

  const result = await LocalEvent.update(
    { _id: id },
    { $set: payload },
    { returnUpdatedDocs: true }
  );

  return result.affectedDocuments ? mapEventOut(result.affectedDocuments) : null;
}

async function deleteEventById(id) {
  if (usingMongo()) {
    const deleted = await MongoEvent.findByIdAndDelete(id).lean();
    return Boolean(deleted);
  }

  const removed = await LocalEvent.remove({ _id: id }, {});
  return removed > 0;
}

async function findEventByName(name) {
  if (usingMongo()) {
    return MongoEvent.findOne({ title: name }).lean();
  }

  return LocalEvent.findOne({ title: name });
}

async function createRegistration(payload) {
  if (usingMongo()) {
    const saved = await new MongoRegistration(payload).save();
    return saved.toObject();
  }

  return LocalRegistration.insert({ ...payload, createdAt: payload.createdAt || new Date() });
}

async function listRegistrations() {
  if (usingMongo()) {
    return MongoRegistration.find().sort({ createdAt: -1 }).lean();
  }

  return LocalRegistration.find({}).sort({ createdAt: -1 });
}

async function getRegistrationById(id) {
  if (usingMongo()) {
    return MongoRegistration.findById(id).lean();
  }

  return LocalRegistration.findOne({ _id: id });
}

async function updateRegistrationById(id, updates) {
  if (usingMongo()) {
    return MongoRegistration.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).lean();
  }

  const result = await LocalRegistration.update(
    { _id: id },
    { $set: updates },
    { returnUpdatedDocs: true }
  );

  return result.affectedDocuments || null;
}

async function deleteRegistrationById(id) {
  if (usingMongo()) {
    const deleted = await MongoRegistration.findByIdAndDelete(id).lean();
    return Boolean(deleted);
  }

  const removed = await LocalRegistration.remove({ _id: id }, {});
  return removed > 0;
}

async function seedRegistrations() {
  const eventsCount = usingMongo()
    ? await MongoEvent.countDocuments()
    : await LocalEvent.count({});

  if (eventsCount === 0) {
    if (usingMongo()) {
      await MongoEvent.insertMany(seedEvents);
    } else {
      await LocalEvent.insert(seedEvents.map(item => ({ ...item, createdAt: new Date() })));
    }
  }

  const seededEvents = await listEvents();
  const eventMap = seededEvents.reduce((acc, eventItem) => {
    acc[eventItem.title] = eventItem.id;
    return acc;
  }, {});

  if (usingMongo()) {
    const count = await MongoRegistration.countDocuments();
    if (count > 0) {
      return { inserted: 0, skipped: true, store: 'mongo' };
    }

    await MongoRegistration.insertMany(
      seedRegistrationRows.map(item => ({
        ...item,
        eventId: eventMap[item.event]
      }))
    );
    return { inserted: seedRegistrationRows.length, skipped: false, store: 'mongo' };
  }

  const count = await LocalRegistration.count({});
  if (count > 0) {
    return { inserted: 0, skipped: true, store: 'local' };
  }

  await LocalRegistration.insert(
    seedRegistrationRows.map(item => ({
      ...item,
      eventId: eventMap[item.event],
      createdAt: new Date()
    }))
  );
  return { inserted: seedRegistrationRows.length, skipped: false, store: 'local' };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeStore,
    mongoReadyState: mongoose.connection.readyState
  });
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await listEvents({
      search: req.query.search,
      category: req.query.category
    });

    res.json({ count: events.length, data: events, activeStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const eventRow = await getEventById(req.params.id);
    if (!eventRow) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ data: eventRow, activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid event id.' });
  }
});

app.post('/api/events', async (req, res) => {
  const requiredFields = ['title', 'slug', 'summary', 'description', 'category', 'location', 'startAt', 'endAt', 'capacity'];
  const missing = requiredFields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  try {
    const payload = {
      title: req.body.title,
      slug: req.body.slug,
      summary: req.body.summary,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      startAt: new Date(req.body.startAt),
      endAt: new Date(req.body.endAt),
      capacity: Number(req.body.capacity),
      heroImage: req.body.heroImage || '',
      published: req.body.published !== false
    };

    const created = await createEvent(payload);
    res.status(201).json({ message: 'Event created.', data: created, activeStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  const updates = {};
  ['title', 'slug', 'summary', 'description', 'category', 'location', 'heroImage', 'published'].forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (req.body.startAt) {
    updates.startAt = new Date(req.body.startAt);
  }
  if (req.body.endAt) {
    updates.endAt = new Date(req.body.endAt);
  }
  if (req.body.capacity !== undefined) {
    updates.capacity = Number(req.body.capacity);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'At least one field is required to update.' });
  }

  try {
    const updated = await updateEventById(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ message: 'Event updated.', data: updated, activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid event id.' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const removed = await deleteEventById(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ message: 'Event deleted.', activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid event id.' });
  }
});

app.post('/api/registrations', async (req, res) => {
  const { name, email, phone, college, eventId } = req.body;
  if (!name || !email || !phone || !college || !eventId) {
    return res.status(400).json({ error: 'name, email, phone, college, and eventId are required.' });
  }

  try {
    const eventRow = await getEventById(eventId);
    if (!eventRow) {
      return res.status(404).json({ error: 'Selected event does not exist.' });
    }

    const created = await createRegistration({
      name,
      email,
      phone,
      college,
      event: eventRow.title,
      eventId: eventRow.id,
      status: 'confirmed',
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Registered successfully!', data: created, activeStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/register', async (req, res) => {
  const { name, email, phone, college, event, eventId } = req.body;
  if (!name || !email || !phone || !college || !event) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    let resolvedEventId = eventId;
    if (!resolvedEventId) {
      const matched = await findEventByName(event);
      if (matched) {
        resolvedEventId = String(matched._id);
      }
    }

    const created = await createRegistration({
      name,
      email,
      phone,
      college,
      event,
      eventId: resolvedEventId,
      status: 'confirmed',
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Registered successfully!', data: created, activeStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/registrations', async (req, res) => {
  try {
    const registrations = await listRegistrations();
    res.json({ count: registrations.length, data: registrations, activeStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/registrations/:id', async (req, res) => {
  try {
    const registration = await getRegistrationById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({ data: registration, activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid registration id.' });
  }
});

app.put('/registrations/:id', async (req, res) => {
  const updates = {};
  ['name', 'email', 'phone', 'college', 'event'].forEach((field) => {
    if (req.body[field]) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'At least one field is required to update.' });
  }

  try {
    const updated = await updateRegistrationById(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({ message: 'Registration updated.', data: updated, activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid registration id.' });
  }
});

app.delete('/registrations/:id', async (req, res) => {
  try {
    const removed = await deleteRegistrationById(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({ message: 'Registration deleted.', activeStore });
  } catch (err) {
    res.status(400).json({ error: 'Invalid registration id.' });
  }
});

app.post('/seed', async (req, res) => {
  try {
    const result = await seedRegistrations();
    if (result.skipped) {
      return res.json({ message: 'Seed skipped because data already exists.', ...result });
    }

    res.status(201).json({ message: 'Seed data inserted.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT || 5000, () => {
  console.log('Server running');
});
