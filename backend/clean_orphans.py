from config.db import db
from bson import ObjectId

exams = {e['_id'] for e in db.exams.find({}, {"_id": 1})}
subs = db.submissions.find()
orphaned_ids = []
for sub in subs:
    exam_id = sub.get("exam_id")
    if isinstance(exam_id, str):
        try:
            exam_id = ObjectId(exam_id)
        except:
            pass
            
    if exam_id not in exams:
        orphaned_ids.append(sub["_id"])

if orphaned_ids:
    db.submissions.delete_many({"_id": {"$in": orphaned_ids}})

print(f"Cleaned {len(orphaned_ids)} orphaned submissions.")
