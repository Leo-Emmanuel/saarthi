from config.db import db

print("Normalizing user records...")
for u in db.users.find():
    update = {}
    if "email" in u and isinstance(u["email"], str):
        cleaned_email = u["email"].strip().lower()
        if u["email"] != cleaned_email:
            update["email"] = cleaned_email
    
    if "studentId" in u and isinstance(u["studentId"], str):
        cleaned_id = u["studentId"].strip()
        if u["studentId"] != cleaned_id:
            update["studentId"] = cleaned_id

    if update:
        db.users.update_one({"_id": u["_id"]}, {"$set": update})
        print(f"Updated record for {u.get('name', 'Unknown')}: {update}")

print("Done.")
