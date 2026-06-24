# Rebuild MongoDB Vector Index - Gemini 1024 Dims

APMS hiện dùng Vertex AI `gemini-embedding-001` với `GEMINI_EMBEDDING_OUTPUT_DIMENSION=1024`. MongoDB Atlas Vector Search index phải có cùng dimension.

> Cẩn thận: rebuild index và reset processing state có thể khiến worker reprocess nhiều tài liệu. Chỉ chạy khi đã backup hoặc hiểu rõ dữ liệu môi trường.

## 1. Kiểm Tra Env

```env
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_OUTPUT_DIMENSION=1024
```

## 2. Atlas Vector Search Index

Tạo hoặc cập nhật vector index cho collection `document_chunks` với field embedding.

Ví dụ cấu hình index:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "ownerId"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

Nếu search service filter thêm field khác, thêm filter field tương ứng vào index.

## 3. Reset Chunks Khi Đổi Dimension

Khi đổi embedding dimension, chunks cũ không còn tương thích. Reset trạng thái để worker tạo lại chunks:

```js
db.document_chunks.deleteMany({});
db.documents.updateMany(
  { status: { $in: ["ready", "failed"] } },
  {
    $set: {
      status: "processing",
      chunkCount: 0,
      processingAttempts: 0,
      lastError: null,
      nextRetryAt: null
    }
  }
);
```

Restart API để document worker xử lý lại.

## 4. Verification

```bash
cd api
pnpm build
```

Sau khi worker chạy, kiểm tra:

- `document_chunks.embedding.length === 1024`.
- Search trả kết quả cho tài liệu `ready`.
- Chat citations trỏ về tài liệu/chunk hợp lệ.
