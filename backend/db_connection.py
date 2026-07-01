import os
import sys
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

# MongoDB URI configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "mits_newspaper")

client = None
db = None

try:
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    # Attempt a connection with a 1500ms timeout
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
    # Trigger connection check
    client.admin.command('ping')
    db = client[DB_NAME]
    print("Successfully connected to MongoDB!")
except (ServerSelectionTimeoutError, Exception) as e:
    print("Could not connect to MongoDB server.", file=sys.stderr)
    print("Falling back to in-memory mongomock database for development...", file=sys.stderr)
    try:
        import mongomock
        client = mongomock.MongoClient()
        db = client[DB_NAME]
        print("Connected to in-memory mongomock database successfully.")
    except ImportError:
        print("CRITICAL: mongomock is not installed and MongoDB is unavailable.", file=sys.stderr)
        raise e

# Export collections
users_col = db["users"]
posts_col = db["posts"]
comments_col = db["comments"]
likes_col = db["likes"]
followers_col = db["followers"]
saved_posts_col = db["saved_posts"]
notifications_col = db["notifications"]
themes_col = db["themes"]
reports_col = db["reports"]
announcements_col = db["announcements"]

def get_db():
    return db
