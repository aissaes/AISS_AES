---
title: GradeLM AES Evaluation Space
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
short_description: GradeLM Automated Essay Scoring & Evaluation Microservice
---

# GradeLM Evaluation & Embedding Microservice

This Hugging Face Space hosts the GradeLM model for academic answer evaluation, grading, and embedding generation.

## Endpoints

- `POST /evaluate`: Evaluates student answers based on Teacher Key, Context Notes, and Max Marks.
- `POST /embed`: Generates vector embeddings for input text snippets.
- `Gradio API`: Exposes Gradio interface for interactive sandbox testing.
