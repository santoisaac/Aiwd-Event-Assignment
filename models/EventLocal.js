const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const eventStore = Datastore.create({
  filename: path.join(dataDir, 'events.db'),
  autoload: true,
  timestampData: true
});

module.exports = eventStore;