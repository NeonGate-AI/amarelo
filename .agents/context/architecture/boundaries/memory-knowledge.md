# Memory ↔ Knowledge boundary

Personal longitudinal Memory and non-personal Knowledge/RAG are separate capabilities. Knowledge belongs to `@ai/knowledge`; Memory belongs to Memory Nucleus. They may share neutral evaluation primitives but must not share private stores, authorization state or domain models.

Memory retrieval may use techniques common in RAG (FTS, structured filters, optional embeddings), but Memory is not Knowledge RAG.
