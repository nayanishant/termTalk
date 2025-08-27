import os
from flask_cors import CORS
from uuid import uuid4
from flask import jsonify, request
from database import app, db
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
import chromadb
from flask_apscheduler import APScheduler
from models import User, Files

class Config:
    SCHEDULER_API_ENABLED = True

app.config.from_object(Config())

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = { 'pdf' }
CHROMA_PATH = 'chroma_db'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

api_key = os.getenv("GEMINI_API_KEY")
llm = ChatGoogleGenerativeAI(
    api_key=api_key,
    model="gemini-2.0-flash-exp",
    temperature=0.6,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)

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

@scheduler.task('interval', id='job-1', seconds=60, misfire_grace_time=500)
def process_pdf():
    with scheduler.app.app_context():
        print("Entered Scheduler")
        file = Files.query.filter_by(status='Uploaded').first()

        if not file:
            print("No files found in uploaded state.")
            return
        
        try:
            file.status = "Processing"
            db.session.commit()

            file_path = os.path.join(UPLOAD_FOLDER, file.name)

            if not os.path.exists(file_path):
                file.status = "Failed"
                db.session.commit()
                return
            
            loader = PyPDFLoader(file_path)
            raw_document = loader.load()

            if not raw_document:
                file.status = "Failed"
                db.session.commit()
                return

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=300,
                chunk_overlap=0,
                length_function=len,
                is_separator_regex=False,
            )
            chunks = text_splitter.split_documents(raw_document)


            if not chunks:
                file.status = "Failed"
                db.session.commit()
                return

            documents = []
            metadata = []
            ids = []

            for i, chunk in enumerate(chunks):
                documents.append(chunk.page_content)
                ids.append(f"{file.uid}_chunk_{i}")
                metadata.append({"page": chunk.metadata.get("page", None)})

            collection = chroma_client.get_or_create_collection(name=file.uid)

            collection.upsert(
                documents=documents,
                metadatas=metadata,
                ids=ids
            )

            file.status = "Completed"
            db.session.commit()

            return

        except Exception as e:
            print(e)
            file.status = "Failed"
            db.session.commit()
            return

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_query = data.get("question", "").strip()
    file_uid = data.get("file_uid", "").strip()

    if not user_query:
        return jsonify({"error": "Missing 'question' field"}), 400
    if not file_uid:
        return jsonify({"error": "Missing 'file_uid' field"}), 400

    try:
        collection = chroma_client.get_collection(name=file_uid)
        results = collection.query(query_texts=[user_query], n_results=2)
        docs = results.get("documents", [])
    except Exception as e:
        return jsonify({"error": f"Collection for file_uid '{file_uid}' not found: {e}"}), 404

    system_prompt = (
        "You are a helpful assistant. Answer and question based on context provided. "
        "But you only answer based on knowledge I'm providing you. You don't use your internal "
        "knowledge and you don't make things up.\n"
        "If you don't know the answer, just say: I don't know\n"
        "--------------------\n"
        f"The data:\n{docs}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    try:
        llm_response = llm.invoke(messages)
        answer = getattr(llm_response, "content", str(llm_response))

        return jsonify({"answer": answer}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
