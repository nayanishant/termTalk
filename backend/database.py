import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            
            # Create users table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                );
            """)
            
            # Create files table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    uid VARCHAR(100) NOT NULL UNIQUE,
                    status VARCHAR(20) DEFAULT 'Uploaded'
                );
            """)
            
            conn.commit()
            print("Database initialized successfully.")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error initializing database: {e}")
            if conn:
                conn.rollback()
                conn.close()
    else:
        print("Failed to connect to database for initialization.")

if __name__ == "__main__":
    init_db()
