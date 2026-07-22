# DOMAIN_INDEX.md — Bản đồ file theo domain nghiệp vụ

> Cập nhật file này khi thêm domain mới hoặc di chuyển file lớn giữa các domain; không cần cập nhật cho từng thay đổi nhỏ.
>
> Nguồn sự thật nghiệp vụ vẫn là `PROJECT.md` và `docs/SRS.md`. File này chỉ giúp tra nhanh **vị trí code** của mỗi domain. Layering backend luôn là `Router -> Controller -> Service -> Model` (xem `api/AGENTS.md`).

---

### Auth & Onboarding
**Mục đích**: Đăng nhập Cognito/Google, đồng bộ JWT sang user local, thiết lập hồ sơ và hồ sơ học vụ.
- **Routes/Pages**: web `app/login/`, `app/auth/callback/`, `app/(app)/profile/`; mobile `app/login.tsx`, `app/auth/callback.tsx`, `app/profile/`
- **API**: `api/src/routes/auth.routes.ts`, `users.routes.ts` -> `auth.controller.ts`, `users.controller.ts`
- **Lib/Service**: `api/src/services/auth.service.ts`, `user.service.ts`; `api/src/config/cognito.ts`; web `lib/amplify.ts`, mobile `lib/amplify.ts`/`lib/auth-session.ts`
- **Hooks/Queries**: web `lib/queries/users.ts`, `lib/academic-profile.ts`; mobile `lib/academic-profile.ts`
- **Components**: web `components/app/onboarding/AcademicProfileWizard.tsx`, `AmplifyProvider.tsx`, `RequireAuth.tsx`; mobile `components/app/RequireAuth.tsx`
- **Client state**: web/mobile `stores/auth-store.ts`
- **Liên quan tới**: Admin (role, disable), Academic Catalog (profile chọn curriculum)
- **Xem quyết định**: Axios interceptor gắn Cognito idToken

### Academic Catalog
**Mục đích**: Curricula, subjects, semesters, curriculum-semesters, course-slots — dùng soft-archive và integrity guards.
- **Routes/Pages**: web `app/(app)/admin/curricula/`; mobile `app/admin/catalog.tsx`
- **API**: `api/src/routes/catalog.routes.ts` (read) + phần catalog trong `admin.routes.ts` -> `admin.controller.ts`
- **Lib/Service**: `api/src/services/academic.service.ts` (integrity guards BR-017..021), `admin.service.ts`; models `curriculum`/`subject`/`semester`/`curriculum-semester`/`course-slot`.model.ts
- **Hooks/Queries**: web `lib/queries/catalog.ts`, `lib/queries/admin.ts`; mobile `hooks/useCatalog.ts`, `hooks/useAdminCatalog.ts`
- **Components**: web `components/app/admin/` (Curricula/Semesters/Subjects/CurriculumSemesters panels); mobile `components/app/admin/CatalogFormModal.tsx`, `CourseSlotPicker.tsx`
- **Liên quan tới**: Documents (uploads bắt buộc `courseSlotId`), Auth (hồ sơ học vụ), Admin
- **Xem quyết định**: Soft-archive + referential-integrity guards

### Documents & Workspace (Drive)
**Mục đích**: Surface tài liệu thống nhất — list/upload/star/trash/restore + cây thư mục cá nhân.
- **Routes/Pages**: web `app/(app)/drive/`, `starred/`, `trash/`, `documents/[documentId]/`; mobile `app/(tabs)/drive/`, `app/documents/`
- **API**: `api/src/routes/documents.routes.ts`, `folders.routes.ts` -> `documents`/`folders` controllers
- **Lib/Service**: `api/src/services/document.service.ts` (`assertQuota`), `document-list.service.ts`, `folder.service.ts`, `s3.service.ts`
- **Hooks/Queries**: web `lib/queries/internal-documents.ts`; mobile `hooks/useDocuments.ts`, `useDrive.ts`, `useFolders.ts`, `useDriveItemActions.ts`
- **Components**: web `components/app/` (DocumentCard, FileGrid, Folder*, UploadModal, viewers); mobile `components/app/` (FileItem, FolderItem, UploadSheet, DocumentMetaCard)
- **Liên quan tới**: Academic Catalog, Sharing, Processing Pipeline, Public Library
- **Xem quyết định**: Unified `/api/documents` thay drive/library/forum; UI giữ tên route cũ

### Public Library / Discovery
**Mục đích**: Khám phá tài liệu `public` với filter curriculum/semester/subject/match.
- **Routes/Pages**: web `app/(app)/library/`, `app/(app)/forum/`; mobile `app/(tabs)/library.tsx`
- **API**: cùng `documents.routes.ts` với `view=public`
- **Lib/Service**: `api/src/services/document-list.service.ts`; web `lib/queries/public-documents.ts`
- **Components**: web `components/app/library/` (LibraryTabs, LibraryBrowsePanel, LibrarySuggestedPanel, MatchTypeBadge)
- **Liên quan tới**: Documents, Academic Catalog
- **Xem quyết định**: Web giữ `library`/`forum` làm tên UI route

### Sharing & Invites
**Mục đích**: Chia sẻ read-only document/folder trực tiếp + luồng invite (hết hạn 7 ngày).
- **Routes/Pages**: web `app/(app)/shared/`, `app/invite/[token]/`; mobile `app/(tabs)/drive/shared.tsx`, `app/invite/[token].tsx`
- **API**: `api/src/routes/shares.routes.ts`, `invites.routes.ts`
- **Lib/Service**: `api/src/services/share.service.ts`, `invite.service.ts`, `mailer.service.ts`; models `share`/`shareInvite`.model.ts
- **Hooks/Queries**: web `lib/queries/shares.ts`; mobile `hooks/useShares.ts`, `useInvite.ts`
- **Components**: web `components/app/ShareModal.tsx`; mobile `components/app/ShareSheet.tsx`
- **Liên quan tới**: Documents, Auth
- **Xem quyết định**: —

### Document Processing Pipeline
**Mục đích**: Worker biến file thành chunk có embedding: extraction -> chunking -> embeddings -> Atlas Vector Search.
- **API/Worker**: `api/src/workers/document.worker.ts`; `services/processing.service.ts`, `extraction.service.ts` + `services/extraction/` (pdf/docx/pptx/vision-markdown), `chunking.service.ts`
- **AI**: `api/src/services/ai/embedding-utils.ts`, `gemini.provider.ts`, `ai.service.ts`; model `document-chunk.model.ts`
- **Status flow**: `pending -> processing -> ready -> failed` (bounded retries) — xem `api/AGENTS.md`
- **Liên quan tới**: Documents, Search, AI Chat
- **Xem quyết định**: AI provider abstraction (facade quanh Gemini)

### Semantic Search
**Mục đích**: Vector search theo quyền truy cập của user.
- **Routes/Pages**: web `app/(app)/search/`; mobile `app/(tabs)/search.tsx`
- **API**: `api/src/routes/search.routes.ts` -> `search.controller.ts`
- **Lib/Service**: `api/src/services/search.service.ts`, `ai/retrieval.service.ts`, `ai/rerank.ts`, `ai/query-rewrite.ts`
- **Hooks/Queries**: web `lib/queries/search.ts`; mobile `hooks/useSearch.ts`
- **Components**: mobile `components/app/SearchResultCard.tsx`, `SearchPromptState.tsx`
- **Liên quan tới**: Processing Pipeline, AI Chat
- **Xem quyết định**: AI provider abstraction

### AI RAG Chat
**Mục đích**: Chat có dẫn nguồn: session/message, streaming, citations, rerank; giới hạn 50 lượt/người/ngày.
- **Routes/Pages**: web `app/(app)/chat/`; mobile `app/(tabs)/chat/`
- **API**: `api/src/routes/chat.routes.ts` -> chat controller/service
- **Lib/Service**: `api/src/services/chat.service.ts`; `services/ai/` (`retrieval.service.ts`, `chat-prompts.ts`, `citation-utils.ts`, `reference-utils.ts`, `rerank.ts`, `gemini-retry.ts`); models `chat-session`/`chat-message`
- **Hooks/Queries**: mobile `hooks/useChat.ts`; web `lib/chat-daily-usage.ts`, `lib/chat-visibility.ts`
- **Components**: web `components/app/chat/` (Citation*, ChatSourcePickerModal, remark-citations); mobile `components/app/chat/` (ChatBubble, ChatInputBar, CitationCard, SuggestedQuestions)
- **Liên quan tới**: Search, Processing Pipeline, Documents (citations deep-link)
- **Xem quyết định**: AI provider abstraction; giới hạn business đọc từ validated env

### Admin & Access Control
**Mục đích**: Quản lý user (quota/disable/role), stats, email allowlist/access-emails, và catalog admin.
- **Routes/Pages**: web `app/(app)/admin/`; mobile `app/admin/` (users, access-emails, catalog)
- **API**: `api/src/routes/admin.routes.ts` -> `admin.controller.ts` (ordering middleware `authenticate -> resolveUser -> requireActiveUser -> requireAdmin`)
- **Lib/Service**: `api/src/services/admin.service.ts`, `access-email.service.ts`, `cognito-admin.service.ts`; model `access-email.model.ts`
- **Hooks/Queries**: web `lib/queries/admin.ts`, `lib/queries/admin-access-emails.ts`, `lib/admin/client-table.ts`; mobile `hooks/useAdminAccessEmails.ts`, `useAdminCatalog.ts`
- **Components**: web `components/app/admin/`, `UsersTable.tsx`, `AdminStatsGrid.tsx`; mobile `components/app/admin/`, `AdminUserCard.tsx`, `AdminStatsCard.tsx`
- **Liên quan tới**: Auth, Academic Catalog
- **Xem quyết định**: Soft-archive + referential-integrity guards
