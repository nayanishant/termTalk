import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
from uuid import uuid4
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
import chromadb
from flask_apscheduler import APScheduler
import logging
from functools import lru_cache
from typing import Dict, Any
from dotenv import load_dotenv

# Import database connection
from database import get_db_connection, init_db

load_dotenv()

# Initialize Flask App
app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Config:
    SCHEDULER_API_ENABLED = True
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    CHROMA_PATH = os.getenv('CHROMA_PATH', 'chroma_db')
    ALLOWED_EXTENSIONS = {'pdf'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

app.config.from_object(Config())

# Initialize Scheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# Ensure Upload Folder Exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize ChromaDB
# chroma_client = chromadb.HttpClient(host="chromadb", port=9999)
chroma_client = chromadb.PersistentClient(path=app.config['CHROMA_PATH'])
app.config['chroma_client'] = chroma_client

# Initialize LLM
if not app.config['GEMINI_API_KEY']:
    logger.error("GEMINI_API_KEY is missing")
    raise ValueError("GEMINI_API_KEY environment variable is required")

llm = ChatGoogleGenerativeAI(
    api_key=app.config['GEMINI_API_KEY'],
    model="gemini-2.0-flash-exp",
    temperature=0.6,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)
app.config['llm'] = llm

# Helper: Allowed Extensions
def allowed_extensions(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Initialize Database Tables on Startup
with app.app_context():
    try:
        init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

# --- Routes ---

@app.route("/")
def home():
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({"message": "Flask + PostgreSQL (Neon) is connected!"})
    return jsonify({"error": "Database connection failed"}), 500

@app.route("/users", methods=["GET"])
def get_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name FROM users;")
        users = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(users)
    except Exception as e:
        if conn: conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No Selected file"}), 400
    
    if file and allowed_extensions(file.filename):
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        file_uid = str(uuid4())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database error"}), 500
        
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO files (name, uid, status) VALUES (%s, %s, %s)",
                (filename, file_uid, "Uploaded")
            )
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"message": f"File {filename} uploaded successfully."}), 200
        except Exception as e:
            if conn: conn.close()
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file type"}), 400

@app.route("/files", methods=["GET"])
def get_all_files():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, uid, name, status FROM files;")
        files = cur.fetchall()
        cur.close()
        conn.close()
        
        if not files:
             return jsonify({"message": "No files found. Please upload a file."}), 404
             
        return jsonify(files)
    except Exception as e:
        if conn: conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/delete-file/<string:file_uid>", methods=["DELETE"])
def delete_file(file_uid):
    conn = get_db_connection()
    if not conn:
         return jsonify({"error": "Database error"}), 500
    
    try:
        # Get file first to delete from filesystem
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT name, uid FROM files WHERE uid = %s;", (file_uid,))
        file = cur.fetchone()
        
        if not file:
            cur.close()
            conn.close()
            return jsonify({"error": "File not found"}), 404

        file_name = file['name']
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
        if os.path.exists(file_path):
            os.remove(file_path)

        # Delete from DB
        cur.execute("DELETE FROM files WHERE uid = %s;", (file_uid,))
        conn.commit()
        cur.close()
        conn.close()

        # Delete from Chroma
        try:
            chroma_client.delete_collection(name=file_uid)
        except Exception as e:
            app.logger.warning(f"Could not delete collection {file_uid}: {e}")

        return jsonify({"message": f"File {file_name} deleted successfully"}), 200

    except Exception as e:
        if conn: conn.close()
        return jsonify({"error": str(e)}), 500

# --- Background Jobs ---

@scheduler.task('interval', id='job-1', seconds=60, misfire_grace_time=500, max_instances=1)
def process_pdf():
    # Note: Scheduler runs in its own context/thread, so we need fresh connections
    with app.app_context():
        logger.info("Starting PDF processing job")
        
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed in background job")
            return

        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Find first file in 'Uploaded' state
            cur.execute("SELECT * FROM files WHERE status = 'Uploaded' LIMIT 1;")
            file = cur.fetchone()
            
            if not file:
                cur.close()
                conn.close()
                logger.info("No files in 'Uploaded' state")
                return

            file_id = file['id']
            file_name = file['name']
            file_uid = file['uid']
            
            # Update status to Processing
            cur.execute("UPDATE files SET status = 'Processing' WHERE id = %s;", (file_id,))
            conn.commit()
            
            logger.info(f"Processing file: {file_name} (UID: {file_uid})")

            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                cur.execute("UPDATE files SET status = 'Failed' WHERE id = %s;", (file_id,))
                conn.commit()
                cur.close()
                conn.close()
                return

            # RAG Processing
            try:
                loader = PyPDFLoader(file_path)
                raw_document = loader.load()
                if not raw_document:
                     raise ValueError("No content loaded")

                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=500,
                    chunk_overlap=150,
                    length_function=len,
                    is_separator_regex=True,
                    separators=["\n\n", "\n", r"^\d+\.\s", r"^\w+\.\s", ". ", " "],
                    keep_separator=True
                )
                chunks = text_splitter.split_documents(raw_document)
                if not chunks:
                     raise ValueError("No chunks created")

                documents = []
                metadata = []
                ids = []
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"{file_uid}_chunk_{i}")
                    metadata.append({
                        "page": chunk.metadata.get("page", None),
                        "source": file_name,
                        "chunk_id": i
                    })

                collection = app.config['chroma_client'].get_or_create_collection(name=file_uid)
                collection.upsert(documents=documents, metadatas=metadata, ids=ids)
                
                logger.info(f"Upserted {len(documents)} chunks for {file_name}")
                
                # Mark as Completed
                cur.execute("UPDATE files SET status = 'Completed' WHERE id = %s;", (file_id,))
                conn.commit()
                logger.info(f"Successfully processed {file_name}")

            except Exception as e:
                logger.error(f"Error processing {file_name}: {str(e)}")
                # Re-acquire cursor if needed (transaction might be aborted? In psycopg2, yes)
                # But here we are in a block. We should probably rollback and start fresh if transaction failed.
                conn.rollback() 
                cur.execute("UPDATE files SET status = 'Failed' WHERE id = %s;", (file_id,))
                conn.commit()
            
            cur.close()
            conn.close()

        except Exception as e:
            logger.error(f"Job execution error: {e}")
            if conn:
                conn.rollback() 
                conn.close()

@lru_cache(maxsize=100)
def query_chroma(file_uid: str, query_text: str) -> Dict[str, Any]:
    """Cached Chroma query to retrieve relevant document chunks."""
    try:
        collection = app.config['chroma_client'].get_collection(name=file_uid)
        results = collection.query(query_texts=[query_text], n_results=3, include=['documents', 'metadatas'])
        return {
            'documents': results.get('documents', [[]])[0],
            'metadatas': results.get('metadatas', [[]])[0]
        }
    except Exception as e:
        logger.error(f"Chroma query failed for file_uid '{file_uid}': {str(e)}")
        raise

@app.route("/chat", methods=["POST"])
def chat():
    """Handle user queries for T&C documents using RAG."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_query = data.get("question", "").strip()
        file_uid = data.get("file_uid", "").strip()

        if not user_query or not file_uid:
            return jsonify({"error": "Missing question or file_uid"}), 400

        results = query_chroma(file_uid, user_query)
        docs = results['documents']
        metadatas = results['metadatas']

        if not docs:
            return jsonify({"answer": "I don't know", "source": "N/A", "page": "N/A"}), 200

        context = "\n\n".join([
            f"Section (Page {meta.get('page', 'Unknown')}): {doc}"
            for doc, meta in zip(docs, metadatas)
        ])

        system_prompt = (
            "You are a legal assistant specializing in Terms and Conditions analysis. "
            "Answer the user's query concisely and accurately based only on the provided context. "
            "Cite specific sections or pages when relevant. If the context doesn't contain the answer, "
            "respond with 'I don't know.' Do not use external knowledge or make assumptions."
            f"\n\nContext:\n{context}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]

        llm_response = app.config['llm'].invoke(messages)
        answer = getattr(llm_response, "content", str(llm_response)).strip()

        response = {
            "answer": answer,
            "source": metadatas[0].get("source", "Unknown") if metadatas else "N/A",
            "page": metadatas[0].get("page", "N/A") if metadatas else "N/A"
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8080)
