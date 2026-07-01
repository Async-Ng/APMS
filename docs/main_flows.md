# Ba quy trình chính APMS — Activity Diagram (Swimlane)

Tài liệu mô tả ba luồng nghiệp vụ chính dành cho **sinh viên**, trình bày dưới dạng Activity Diagram UML với hai swimlane:

| Vị trí | Lane |
|--------|------|
| **Trái** | Sinh viên |
| **Phải** | Hệ thống APMS |

**Nguồn nghiệp vụ:** [SRS.md](./SRS.md) §3.1–3.8

**Nguồn sơ đồ:** thư mục [diagrams/](./diagrams/)

## Cách render

- Mở file `.puml` trong VS Code với extension [PlantUML](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml), hoặc
- Dán nội dung vào [plantuml.com/plantuml](https://www.plantuml.com/plantuml/uml)
- Export PNG/SVG để dùng trong slide hoặc báo cáo

PlantUML Activity swimlane (`|Tên lane|`) đảm bảo hai cột dọc **cùng hàng, cùng chiều cao** — lane khai báo trước (`Sinh viên`) luôn nằm bên trái.

```
┌─────────────────────┬─────────────────────┐
│     Sinh viên       │   Hệ thống APMS     │
│     (trái)          │     (phải)          │
├─────────────────────┼─────────────────────┤
│  [hoạt động SV]     │  [hoạt động HT]     │
│         │           │         ▲           │
│         └───────────┼─────────┘           │
└─────────────────────┴─────────────────────┘
```

---

## Activity 1 — Vào hệ thống và thiết lập hồ sơ học thuật

**SRS:** FR-001–FR-012, BR-002

Sinh viên đăng nhập Google; hệ thống kiểm tra email trong allowlist. Nếu được phép, tài khoản được tạo hoặc đồng bộ. Khi vào Drive, nếu hồ sơ học thuật chưa hoàn thành, sinh viên chọn Ngành và Học kỳ hiện tại; hệ thống **mặc định chọn tất cả** môn trong CTĐT của học kỳ đó, sinh viên bỏ tick môn không học rồi lưu. Hệ thống xác thực môn thuộc đúng Ngành–Học kỳ trước khi ghi nhận trạng thái **Đã hoàn thành**.

**File:** [diagrams/apms-activity-1.puml](./diagrams/apms-activity-1.puml)

---

## Activity 2 — Quản lý tài liệu học tập (Drive của tôi)

**SRS:** FR-013–FR-034, FR-061; BR-006–BR-010, BR-015, BR-027

Sinh viên vào Drive để xem tài liệu được nhóm theo các môn trong CTĐT đã chọn ở hồ sơ học thuật. Có thể tải tài liệu mới (PDF/DOCX/PPTX, ≤ 50 MB, còn quota, môn thuộc CTĐT trong hồ sơ) hoặc xem danh sách hiện có. Tài liệu hợp lệ được lưu mặc định **Riêng tư**, xử lý nền đọc nội dung, rồi hiển thị nhóm theo môn. Các thao tác tuỳ chọn: sắp xếp thư mục, đổi tên, thẻ, gắn sao; chia sẻ chỉ đọc (lời mời hết hạn 7 ngày); đặt Riêng tư/Công khai; thùng rác (tự xóa vĩnh viễn sau 30 ngày).

**File:** [diagrams/apms-activity-2.puml](./diagrams/apms-activity-2.puml)

---

## Activity 3 — Khám phá tri thức và học với trợ lý AI

**SRS:** FR-035–FR-045, FR-062; BR-005

Sinh viên chọn kênh: **Thư viện công khai** (Gợi ý hoặc Duyệt toàn bộ), **Tìm kiếm** ngữ nghĩa, hoặc **Trò chuyện AI** (Hỏi đáp, Tóm tắt, FAQ, Ôn tập). Hệ thống chỉ lọc tài liệu trong phạm vi quyền đọc (của mình, được chia sẻ, công khai). Trò chuyện AI giới hạn 50 lượt/ngày; câu trả lời kèm trích dẫn nguồn. Thư viện công khai chỉ xem/tải — **không** thảo luận hay bình luận.

**File:** [diagrams/apms-activity-3.puml](./diagrams/apms-activity-3.puml)
