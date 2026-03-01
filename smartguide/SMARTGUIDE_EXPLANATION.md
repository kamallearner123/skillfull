# How SmartGuide Works

SmartGuide is the specialized AI microservice that serves as the "brain" of the SkillFull platform. It provides high-performance, personalized placement coaching using state-of-the-art Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG).

## 1. Core Architecture

SmartGuide operates as a standalone service built with **FastAPI**. By decoupling it from the main Django backend, we ensure that resource-heavy AI operations don't slow down the rest of the application.

- **LLM Engine**: Powered by **vLLM** (running on your NVIDIA GPU) or **llama.cpp** (on CPU).
- **Communication**: Communicates with the Django backend over an internal REST API.
- **Memory**: Uses **Redis** for persistent, multi-turn conversation memory.
- **Vector Store**: Uses **ChromaDB** to store and retrieve study materials.

## 2. Key Technologies

### vLLM & GPU Optimization
SmartGuide is optimized for consumer-grade hardware. For a **4GB VRAM GPU** (like the GTX 1650 Ti), it uses:
- **Eager Execution**: Disabled CUDA graphs to save ~2GB of VRAM.
- **Quantization/Small Models**: Specifically tuned to run the **Qwen 2.5 1.5B** model, which provides high intelligence with a small memory footprint.

### Retrieval-Augmented Generation (RAG)
To prevent "hallucinations," SmartGuide uses RAG. Before answering, it:
1.  Converts the user's query into a mathematical vector.
2.  Searches the **ChromaDB** for relevant context from provided study materials.
3.  Injects the most relevant facts into the prompt to "ground" the AI's response in reality.

## 3. Core Features

### Assessment Analysis (`/feedback`)
Analyzes the *patterns* of student mistakes. Instead of just a score, it provides:
- **Performance Summary**: A qualitative review of the attempt.
- **Strengths & Weaknesses**: Identified based on actual Q&A data.
- **Personalized Prep Plan**: A priority list of topics with estimated study hours (e.g., *"Revisit BFS/DFS - 4 hours"*).

### Conversational Assistant (`/chat`)
A real-time AI tutor that:
- **Streams Responses**: Uses **Server-Sent Events (SSE)** to show words as they are generated.
- **Maintains Context**: Remembers previous messages using **Redis**, allowing for natural tutoring sessions.

### Overall Readiness
Aggregates a student's entire history to calculate a **Holistic Readiness Score**, identifying if they are truly prepared for recruitment across all technical domains.

## 4. Data Ingestion (ChromaDB)

To make SmartGuide knowledgeable about specific subjects, you must ingest data into the **ChromaDB** vector store. This process converts text into mathematical embeddings that the RAG system can search.

### A. Bulk Ingestion (The Easy Way)
SmartGuide includes a script for batch-processing study materials.
1.  **Organize Files**: Place your `.txt`, `.md`, or `.pdf` files in the `smartguide/knowledge/` directory, organized by domain folder:
    - `knowledge/DSA/` (Data Structures)
    - `knowledge/AI_ML/` (Machine Learning)
    - `knowledge/Full_Stack/` (Web Dev)
2.  **Run the Script**: Use the provided Python utility to push these files into SmartGuide:
    ```bash
    cd smartguide
    # Ingest everything
    ./venv/bin/python scripts/ingest_knowledge.py
    # OR Ingest a specific domain
    ./venv/bin/python scripts/ingest_knowledge.py --domain "DSA"
    ```
3.  **Automatic Chunking**: The script handles splitting large documents into smaller paragraphs/chunks before sending them to the database.

### B. Direct API Ingestion
For real-time updates or programmatic ingestion, use the `/ingest` POST endpoint:
- **Endpoint**: `POST http://localhost:8080/ingest`
- **Payload Structure**:
  ```json
  {
    "domain": "Cloud / DevOps",
    "chunks": [
      {
        "text": "Docker is a platform for developing, shipping, and running applications...",
        "source": "Docker Documentation",
        "topic": "Containerization"
      }
    ]
  }
  ```

### C. Verifying Ingestion
You can check how much data is stored in each domain collection by visiting the stats endpoint:
- **URL**: `GET http://localhost:8080/ingest/stats`

---

## Technical Summary
- **Backend Framework**: FastAPI/Uvicorn
- **AI Engine**: vLLM (v1)
- **Database (Vector)**: ChromaDB
- **Database (Session)**: Redis
- **Language**: Python 3.11
