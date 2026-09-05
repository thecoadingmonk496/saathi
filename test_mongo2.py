import dns.resolver
import pymongo
# Get the SRV records manually
answers = dns.resolver.resolve('_mongodb._tcp.saathidb.pxrosl7.mongodb.net', 'SRV')
host = str(answers[0].target).rstrip('.')
port = answers[0].port

client = pymongo.MongoClient(f"mongodb://ts7529614_db_user:az9dFYymZD0MAUQ6@{host}:{port}/saathi?ssl=true&authSource=admin")
db = client.saathi
coll = db.mandipricecaches
print('Goa crops:', coll.distinct('commodity', {'state': {'$regex': 'Goa', '$options': 'i'}}))
print('Goa onion count:', coll.count_documents({'state': {'$regex': 'Goa', '$options': 'i'}, 'commodity': {'$regex': 'Onion', '$options': 'i'}}))
