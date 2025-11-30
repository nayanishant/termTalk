# TermTalk

TermTalk is an intelligent document analysis tool designed to help users understand and query Terms and Conditions (T&C) documents. It leverages Retrieval-Augmented Generation (RAG) to provide accurate, context-aware answers to user questions based on uploaded PDF documents.

## Features

- **PDF Upload**: Upload T&C documents (PDF format).
- **Automated Processing**: Background processing of PDFs to extract text, split into chunks, and generate embeddings.
- **RAG-powered Chat**: Ask questions about the uploaded documents and get answers with citations (source and page number).
- **File Management**: View and delete uploaded files.

## Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons)
- **HTTP Client**: Axios

### Backend
- **Framework**: [Flask](https://flask.palletsprojects.com/) (Python)
- **Database**: PostgreSQL (Metadata), [ChromaDB](https://www.trychroma.com/) (Vector Store)
- **LLM**: Google Gemini (`gemini-2.0-flash-exp`) via `langchain-google-genai`
- **Task Queue**: APScheduler (for background PDF processing)
- **PDF Processing**: `pypdf`, `langchain-text-splitters`

## Backend Architecture & Workflow

The backend is built with Flask and orchestrates the document processing and RAG pipeline.

### 1. Document Processing Pipeline (Background Job)
When a PDF is uploaded, it enters a processing queue managed by `APScheduler`. The pipeline runs every 60 seconds:
1. **Ingestion**: The system picks up files with `Uploaded` status.
2. **Extraction**: `PyPDFLoader` extracts raw text from the PDF.
3. **Chunking**: `RecursiveCharacterTextSplitter` breaks text into manageable chunks (500 chars, 150 overlap) to preserve context.
4. **Embedding & Storage**: Chunks are embedded and stored in `ChromaDB` (Vector Store) with metadata (page number, source file).
5. **Completion**: File status updates to `Completed`.

### 2. RAG (Retrieval-Augmented Generation) Workflow
When a user asks a question:
1. **Retrieval**: The system queries `ChromaDB` using the user's question to find the top 3 most relevant document chunks.
2. **Augmentation**: A context window is constructed by combining the retrieved chunks.
3. **Generation**: The context and the user's question are sent to Google's Gemini Pro model (`gemini-2.0-flash-exp`).
4. **Response**: The LLM generates an answer based *only* on the provided context, citing sources.

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (running and accessible)
- **Google Gemini API Key**

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd termTalk
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Set up environment variables:
Create a `.env` file in the `backend` directory with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/termtalk_db
UPLOAD_FOLDER=uploads
CHROMA_PATH=chroma_db
```
*(Note: Ensure your PostgreSQL database is created)*

Run the backend server:

```bash
python server.py
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## Usage

1. Open the frontend application in your browser.
2. Upload a PDF document (e.g., a Terms and Conditions file).
3. Wait for the status to change to "Completed" (processed by the background job).
4. Select the file and start chatting to ask questions about its content.

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check |
| `GET` | `/users` | List users |
| `POST` | `/upload` | Upload a PDF file |
| `GET` | `/files` | List all uploaded files |
| `DELETE` | `/delete-file/<uid>` | Delete a file and its embeddings |
| `POST` | `/chat` | Query a document (requires `file_uid` and `question`) |

## License

[MIT](LICENSE)
