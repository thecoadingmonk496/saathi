const mongoose = require('mongoose');
const uri = 'mongodb+srv://ts7529614_db_user:az9dFYymZD0MAUQ6@saathidb.pxrosl7.mongodb.net/saathi?retryWrites=true&w=majority&appName=SaathiDB';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const count = await db.collection('mandipricecaches').countDocuments({ state: /Goa/i });
  console.log('Total in Goa:', count);
  const docs = await db.collection('mandipricecaches').find({ state: /Goa/i }).toArray();
  console.log('Docs:', JSON.stringify(docs, null, 2));
  mongoose.disconnect();
}).catch(console.error);
