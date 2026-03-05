from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
import os

client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_default_database()
users = db.users

admin = users.find_one({'role': 'admin'})
new_hash = generate_password_hash('Admin@123')

if admin:
    update_op = {'$set': {'password': new_hash}}
    users.update_one({'_id': admin['_id']}, update_op)
    print('Admin credentials reset successfully!')
    print(f'Email: {admin["email"]}')
    print('Password: Admin@123')
else:
    print('No admin user found! Creating one...')
    users.insert_one({
        'name': 'Admin',
        'email': 'admin@saarthi.com',
        'password': new_hash,
        'role': 'admin'
    })
    print('Admin created: admin@saarthi.com / Admin@123')
