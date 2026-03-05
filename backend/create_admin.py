from pymongo import MongoClient
import os
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
users = db.users

def create_admin():
    print("--- Create Admin User ---")
    name = input("Enter Name: ")
    email = input("Enter Email: ")
    password = input("Enter Password: ")
    
    if users.find_one({"email": email}):
        print("Error: User with this email already exists.")
        return

    hashed = generate_password_hash(password)
    
    users.insert_one({
        "name": name,
        "email": email,
        "password": hashed,
        "role": "admin"
    })
    
    print(f"Admin user '{name}' created successfully!")

if __name__ == "__main__":
    create_admin()
