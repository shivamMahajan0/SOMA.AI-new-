"""
AutoML-X — PDF Document Embedder
Simple TF-IDF based text chunking and retrieval for PDF Q&A.
No external vector DB required.
"""
import re
import math
from typing import List, Dict, Any, Tuple
from collections import Counter


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks for retrieval.
    """
    if not text or not text.strip():
        return []

    # Clean text
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()

    if len(words) <= chunk_size:
        return [{"text": text, "index": 0, "word_count": len(words)}]

    chunks = []
    start = 0
    idx = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_text_str = " ".join(chunk_words)

        chunks.append({
            "text": chunk_text_str,
            "index": idx,
            "word_count": len(chunk_words),
        })

        idx += 1
        start += chunk_size - overlap
        if start >= len(words):
            break

    return chunks


def build_tfidf_index(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build a simple TF-IDF index from text chunks.
    Returns: dict with term frequencies and document frequencies.
    """
    if not chunks:
        return {"terms": {}, "doc_count": 0, "chunk_count": 0}

    # Tokenize
    def tokenize(text: str) -> List[str]:
        text = text.lower()
        tokens = re.findall(r'\b[a-z0-9]+\b', text)
        # Remove common stopwords
        stopwords = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                      "being", "have", "has", "had", "do", "does", "did", "will",
                      "would", "could", "should", "may", "might", "can", "shall",
                      "to", "of", "in", "for", "on", "with", "at", "by", "from",
                      "as", "into", "through", "during", "before", "after",
                      "above", "below", "between", "and", "but", "or", "nor",
                      "not", "so", "yet", "both", "either", "neither", "each",
                      "every", "all", "any", "few", "more", "most", "other",
                      "some", "such", "no", "only", "own", "same", "than",
                      "too", "very", "this", "that", "these", "those", "it", "its"}
        return [t for t in tokens if t not in stopwords and len(t) > 1]

    # Build term frequency per chunk
    chunk_tfs = []
    df = Counter()  # Document frequency

    for chunk in chunks:
        tokens = tokenize(chunk["text"])
        tf = Counter(tokens)
        chunk_tfs.append(tf)

        # Count document frequency (each term counted once per chunk)
        for term in set(tokens):
            df[term] += 1

    n_docs = len(chunks)

    # Compute TF-IDF vectors (sparse representation)
    tfidf_vectors = []
    for tf in chunk_tfs:
        tfidf = {}
        for term, count in tf.items():
            idf = math.log(n_docs / (1 + df.get(term, 0)))
            tfidf[term] = count * idf
        tfidf_vectors.append(tfidf)

    return {
        "vectors": tfidf_vectors,
        "df": dict(df),
        "doc_count": n_docs,
        "chunk_count": len(chunks),
    }


def retrieve_relevant_chunks(
    query: str,
    chunks: List[Dict[str, Any]],
    tfidf_index: Dict[str, Any],
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Retrieve the most relevant text chunks for a given query.
    Uses cosine similarity between query TF-IDF and chunk TF-IDF.
    """
    if not chunks or not tfidf_index.get("vectors"):
        return chunks[:top_k] if chunks else []

    # Tokenize query
    query_lower = query.lower()
    query_tokens = re.findall(r'\b[a-z0-9]+\b', query_lower)

    if not query_tokens:
        return chunks[:top_k]

    # Build query TF-IDF
    query_tf = Counter(query_tokens)
    n_docs = tfidf_index["doc_count"]
    df = tfidf_index["df"]

    query_tfidf = {}
    for term, count in query_tf.items():
        idf = math.log(n_docs / (1 + df.get(term, 0)))
        query_tfidf[term] = count * idf

    # Compute cosine similarity with each chunk
    scores = []
    for i, chunk_vec in enumerate(tfidf_index["vectors"]):
        # Dot product
        dot = sum(query_tfidf.get(t, 0) * chunk_vec.get(t, 0) for t in query_tfidf)

        # Magnitudes
        mag_q = math.sqrt(sum(v * v for v in query_tfidf.values()))
        mag_c = math.sqrt(sum(v * v for v in chunk_vec.values()))

        if mag_q > 0 and mag_c > 0:
            cosine_sim = dot / (mag_q * mag_c)
        else:
            cosine_sim = 0

        scores.append((i, cosine_sim))

    # Sort by similarity
    scores.sort(key=lambda x: x[1], reverse=True)

    # Return top_k chunks
    results = []
    for idx, score in scores[:top_k]:
        chunk = chunks[idx].copy()
        chunk["relevance_score"] = round(score, 4)
        results.append(chunk)

    return results
