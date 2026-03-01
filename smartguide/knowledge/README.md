# SmartGuide Knowledge Base

This folder holds your own **course notes, PDFs, and study material** that SmartGuide uses to give richer, more specific feedback via RAG (Retrieval-Augmented Generation).

## Folder Structure

```
knowledge/
├── Data_Engineering/    ← notes/PDFs about Kafka, Spark, SQL, ETL …
├── AI_ML/               ← notes about regression, neural nets, NLP …
├── DSA/                 ← arrays, trees, DP, graphs …
├── Cloud_DevOps/        ← AWS, Docker, Kubernetes, CI/CD …
├── Full_Stack/          ← React, Node, REST, databases …
├── Embedded/            ← microcontrollers, RTOS, C/C++ …
├── Cyber_Security/      ← cryptography, OWASP, network security …
├── Networking/          ← OSI model, TCP/IP, routing …
├── Electronics/         ← digital logic, op-amps, PCB design …
└── Data_Science/        ← statistics, pandas, visualisation …
```

## Supported File Types

| Extension | Works? | Notes |
|:--|:--|:--|
| `.txt` | ✅ | Plain text, best format |
| `.md` | ✅ | Markdown notes |
| `.pdf` | ✅ | Needs `pypdf` installed (`pip install pypdf`) |
| `.json` | ✅ | Array of `{"text": "..."}` objects |
| Any other | ❌ | Convert to `.txt` first |

## How to Ingest

After adding files, run the ingest script:

```bash
cd /home/kamal/Documents/CareerBrook/Placementor/skillfull/smartguide
source venv/bin/activate
python scripts/ingest_knowledge.py
```

Or ingest a single folder manually:

```bash
python scripts/ingest_knowledge.py --domain "Data Engineering"
```

## File Format (`.txt` / `.md`)

Write one concept per paragraph. SmartGuide auto-chunks by paragraph:

```
Apache Kafka is a distributed event streaming platform used for building real-time pipelines. 
Producers publish records to topics; consumers read from topics. Partitions allow parallel processing.

The CAP theorem states that a distributed system can guarantee only two of: Consistency, Availability, 
Partition Tolerance. Most modern distributed databases choose AP (e.g. Cassandra) or CP (e.g. HBase).
```

## Check What's Ingested

```bash
curl http://localhost:8080/ingest/stats
```
