const db = require('./db.js');
db.run("UPDATE providers SET status = 'online', waitTime = ''", (err) => {
  if (err) console.error(err);
  else console.log('Updated providers');
  process.exit(0);
});
