import pymongo
client = pymongo.MongoClient("mongodb+srv://ts7529614_db_user:az9dFYymZD0MAUQ6@saathidb.pxrosl7.mongodb.net/saathi?retryWrites=true&w=majority&appName=SaathiDB")
db = client.saathi
coll = db.mandipricecaches
print('Goa crops:', coll.distinct('commodity', {'state': {'$regex': 'Goa', '$options': 'i'}}))
print('Goa onion count:', coll.count_documents({'state': {'$regex': 'Goa', '$options': 'i'}, 'commodity': {'$regex': 'Onion', '$options': 'i'}}))
