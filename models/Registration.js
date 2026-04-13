const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const dataDir = process.env.VERCEL
  ? '/tmp/mindcraft-data'
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const registrationStore = Datastore.create({
  filename: path.join(dataDir, 'registrations.db'),
  autoload: true,
  timestampData: true
});

module.exports = registrationStore;
