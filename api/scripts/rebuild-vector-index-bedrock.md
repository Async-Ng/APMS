# Hướng dẫn Rebuild MongoDB Vector Index (1024 dims — Bedrock Cohere)

Thực hiện khi chuyển sang `AI_PROVIDER=bedrock` với `cohere.embed-english-v3` (1024 dims).

## Bước 1 — Xóa chunks cũ

Vào **MongoDB Atlas → Collections → `document_chunks`**, chạy trong shell:

```javascript
db.document_chunks.deleteMany({})
```

> Thao tác này không thể hoàn tác. Chunks sẽ được tạo lại khi worker re-process documents.

## Bước 2 — Xóa Vector Search Index cũ

1. Vào **Atlas → Search → Indexes**
2. Tìm index tên `embedding_vector_index` trên collection `document_chunks`
3. Click **Delete**

## Bước 3 — Tạo Vector Search Index mới (1024 dims)

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

5. Click **Create Search Index** → Chờ trạng thái **Active** (~1–2 phút)

Hoặc chạy script tự động (cần `MONGODB_URI` trong `api/.env`):

```powershell
cd api
npx tsx --env-file=.env scripts/setup-atlas.ts
```

## Bước 4 — Reset tất cả documents để re-embed

```javascript
db.documents.updateMany(
  { status: "ready" },
  { $set: { status: "processing" } }
)
```

Worker (`document.worker.ts`) sẽ tự động pick up và re-embed tất cả documents qua Bedrock khi server khởi động lại với `AI_PROVIDER=bedrock`.

## Kiểm tra sau khi xong

```javascript
// Xác nhận chunks mới có đúng 1024 dims
db.document_chunks.findOne({}, { embedding: 1 })
// embedding.length phải === 1024
```

---

## Thông số model

| | Local (trước) | Bedrock (sau) |
|---|---|---|
| Model | `bge-small-en-v1.5` | `cohere.embed-english-v3` |
| Dimensions | 384 | **1024** |
| Provider | `@xenova/transformers` | AWS Bedrock `InvokeModel` |
