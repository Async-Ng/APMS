# Hướng dẫn Rebuild MongoDB Vector Index (1024 dims — Bedrock Cohere)

Thực hiện khi chuyển sang `AI_PROVIDER=bedrock` với `global.cohere.embed-v4:0` (hoặc `cohere.embed-english-v3`, 1024 dims).

## Khi chỉ đổi embedding model (v3 → v4, vẫn 1024 dims)

**Không cần** xóa/tạo lại vector index nếu `BEDROCK_EMBEDDING_OUTPUT_DIMENSION=1024`.

```powershell
cd api
npx tsx --env-file=.env scripts/reindex-bedrock-embed.ts
```

Restart API — worker sẽ re-embed tất cả documents qua model mới.

## Khi đổi số chiều embedding (ví dụ 384 → 1024)

### Bước 1 — Xóa chunks cũ

Vào **MongoDB Atlas → Collections → `document_chunks`**, chạy trong shell:

```javascript
db.document_chunks.deleteMany({})
```

> Thao tác này không thể hoàn tác. Chunks sẽ được tạo lại khi worker re-process documents.

### Bước 2 — Xóa Vector Search Index cũ

1. Vào **Atlas → Search → Indexes**
2. Tìm index tên `embedding_vector_index` trên collection `document_chunks`
3. Click **Delete**

### Bước 3 — Tạo Vector Search Index mới (1024 dims)

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

### Bước 4 — Reset tất cả documents để re-embed

```powershell
cd api
npx tsx --env-file=.env scripts/reindex-bedrock-embed.ts
```

Hoặc thủ công trong MongoDB shell:

```javascript
db.documents.updateMany(
  { status: "ready" },
  { $set: { status: "processing" } }
)
```

Worker (`document.worker.ts`) sẽ tự động pick up và re-embed tất cả documents qua Bedrock khi server khởi động lại với `AI_PROVIDER=bedrock`.

## Kiểm tra sau khi xong

```powershell
cd api
npx tsx --env-file=.env scripts/test-embed.ts
```

```javascript
// Xác nhận chunks mới có đúng 1024 dims
db.document_chunks.findOne({}, { embedding: 1 })
// embedding.length phải === 1024
```

---

## Thông số model

| | Local (trước) | Bedrock v3 | Bedrock v4 (hiện tại) |
|---|---|---|---|
| Model | `bge-small-en-v1.5` | `cohere.embed-english-v3` | `global.cohere.embed-v4:0` |
| Dimensions | 384 | **1024** | **1024** (`output_dimension`) |
| Provider | `@xenova/transformers` | AWS Bedrock `InvokeModel` | AWS Bedrock inference profile |
