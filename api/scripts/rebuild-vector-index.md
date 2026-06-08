# Hướng dẫn Rebuild MongoDB Vector Index (384 dims)

Thực hiện khi chuyển sang local embedding `bge-small-en-v1.5` (384 dims).

## Bước 1 — Xóa chunks cũ

Vào **MongoDB Atlas → Collections → `document_chunks`**, chạy trong shell:

```javascript
db.document_chunks.deleteMany({})
```

> ⚠️ Thao tác này không thể hoàn tác. Chunks sẽ được tạo lại khi worker re-process documents.

## Bước 2 — Xóa Vector Search Index cũ

1. Vào **Atlas → Search → Indexes**
2. Tìm index tên `embedding_vector_index` trên collection `document_chunks`
3. Click **Delete**

## Bước 3 — Tạo Vector Search Index mới (384 dims)

1. Click **Create Index → Atlas Vector Search → JSON Editor**
2. Chọn collection: `document_chunks`
3. Đặt tên index: `embedding_vector_index`
4. Paste JSON sau:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
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

5. Click **Create Search Index** → Chờ trạng thái **Active** (~1-2 phút)

## Bước 4 — Reset tất cả documents để re-embed

```javascript
db.documents.updateMany(
  { status: "ready" },
  { $set: { status: "processing" } }
)
```

Worker (`document.worker.ts`) sẽ tự động pick up và re-embed tất cả documents với `bge-small-en-v1.5` (384 dims) khi server khởi động lại.

## Kiểm tra sau khi xong

```javascript
// Xác nhận chunks mới có đúng 384 dims
db.document_chunks.findOne({}, { embedding: 1 })
// embedding.length phải === 384
```

---

## Thông số model

| | Trước | Sau |
|---|---|---|
| Model | `nomic-embed-text-v1` | `bge-small-en-v1.5` |
| Dimensions | 768 | **384** |
| Kích thước (quantized) | ~270MB | **~30MB** |
| RAM server | ~500MB (OOM Render Free) | **~280MB ✅** |
| Render Free | ❌ | **✅** |
