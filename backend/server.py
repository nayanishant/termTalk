import os
from database import app, db
from flask import jsonify, request
from flask_cors import CORS
from uuid import uuid4
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
import chromadb
from flask_apscheduler import APScheduler
from models import User, Files
import logging
from functools import lru_cache
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Config:
    SCHEDULER_API_ENABLED = True
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'Uploads')
    CHROMA_PATH = os.getenv('CHROMA_PATH', 'chroma_db')
    ALLOWED_EXTENSIONS = {'pdf'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

app.config.from_object(Config())

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = { 'pdf' }
CHROMA_PATH = 'chroma_db'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

chroma_client = chromadb.HttpClient(host="chromadb", port=9999)
# chroma_client = chromadb.PersistentClient(path=app.config['CHROMA_PATH'])
app.config['chroma_client'] = chroma_client

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

CORS(app)

def allowed_extesnions(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

with app.app_context():
    db.create_all()

@app.route("/")
def home():
    return jsonify({"message": "Flask + PostgreSQL is connected!"})

@app.route("/users", methods=["GET"])
def get_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "name": u.name} for u in users])

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No Selected file"}), 400
    
    if file and allowed_extesnions(file.filename):
        filename = file.filename
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        file_uid = str(uuid4())
        new_file = Files(name=filename, uid=file_uid, status="Uploaded")
        db.session.add(new_file)
        db.session.commit()
        return jsonify({"message": f"File {filename} uploaded successfully."}), 200
    else:
        return jsonify({"error": "Invalid file type"}), 400

@app.route("/files", methods=["GET"])
def get_all_files():
    try:
        files = Files.query.all()
        if not files:
            return jsonify({"message": "No files found. Please upload a file."}), 404
        
        return jsonify([
            {
                "id": f.id,
                "uid": f.uid,
                "status": f.status,
                "name": f.name
            } for f in files
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# @app.route("/file/<string:file_uid>", methods=["GET"])
# def get_file_detail(file_uid):
#     file = Files.query.filter_by(uid=file_uid).first()
#     if not file:
#         return jsonify({"error": "File not found"}), 404
    
#     return jsonify({
#         "id": file.id,
#         "uid": file.uid,
#         "name": file.name,
#         "status": file.status,
#     }), 200

@app.route("/delete-file/<string:file_uid>", methods=["DELETE"])
def delete_file(file_uid):
    try:
        file = Files.query.filter_by(uid=file_uid).first()

        if not file:
            return jsonify({"error": "File not found"}), 404

        file_path = os.path.join(UPLOAD_FOLDER, file.name)
        if os.path.exists(file_path):
            os.remove(file_path)

        db.session.delete(file)
        db.session.commit()

        try:
            chroma_client.delete_collection(name=file.uid)
            print(chroma_client.get_collection(name=file.uid))
        except Exception as e:
            app.logger.warning(f"Could not delete collection {file.uid}: {e}")

        return jsonify({"message": f"File {file.name} deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@scheduler.task('interval', id='job-1', seconds=60, misfire_grace_time=500, max_instances=1)
def process_pdf():
    with app.app_context():
        logger.info("Starting PDF processing job")
        file = Files.query.filter_by(status='Uploaded').first()
        if not file:
            logger.info("No files in 'Uploaded' state")
            return

        try:
            file.status = "Processing"
            db.session.commit()
            logger.info(f"Processing file: {file.name} (UID: {file.uid})")

            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.name)
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                file.status = "Failed"
                db.session.commit()
                return

            loader = PyPDFLoader(file_path)
            raw_document = loader.load()
            if not raw_document:
                logger.error(f"No content loaded from {file.name}")
                file.status = "Failed"
                db.session.commit()
                return

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
                logger.error(f"No chunks created for {file.name}")
                file.status = "Failed"
                db.session.commit()
                return

            documents = []
            metadata = []
            ids = []
            for i, chunk in enumerate(chunks):
                documents.append(chunk.page_content)
                ids.append(f"{file.uid}_chunk_{i}")
                metadata.append({
                    "page": chunk.metadata.get("page", None),
                    "source": file.name,
                    "chunk_id": i
                })

            collection = app.config['chroma_client'].get_or_create_collection(name=file.uid)
            collection.upsert(documents=documents, metadatas=metadata, ids=ids)
            logger.info(f"Upserted {len(documents)} chunks for {file.name}")
            file.status = "Completed"
            db.session.commit()
            logger.info(f"Successfully processed {file.name}")

        except Exception as e:
            logger.error(f"Error processing {file.name}: {str(e)}")
            file.status = "Failed"
            db.session.commit()

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
            logger.warning("Invalid JSON in request")
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_query = data.get("question", "").strip()
        file_uid = data.get("file_uid", "").strip()

        if not user_query:
            logger.warning("Missing 'question' field")
            return jsonify({"error": "Missing 'question' field"}), 400
        if not file_uid:
            logger.warning("Missing 'file_uid' field")
            return jsonify({"error": "Missing 'file_uid' field"}), 400
        if len(user_query) > 500:
            logger.warning("Query too long")
            return jsonify({"error": "Query exceeds 500 characters"}), 400

        results = query_chroma(file_uid, user_query)
        docs = results['documents']
        metadatas = results['metadatas']

        if not docs:
            logger.info(f"No relevant documents found for file_uid '{file_uid}' and query: {user_query}")
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

        logger.info(f"Query processed for file_uid '{file_uid}': {user_query}")
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Chat endpoint error for file_uid '{file_uid}': {str(e)}")
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500
