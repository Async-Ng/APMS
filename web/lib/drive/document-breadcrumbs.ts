import type { BreadcrumbItem } from "@/components/ui/BreadcrumbNav";
import type { CatalogCourseSlot } from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";

export function documentBackRoot(from: string | null): BreadcrumbItem {
  if (from === "public") {
    return { label: "Thư viện công khai", href: "/library" };
  }
  if (from === "shared") {
    return { label: "Đã chia sẻ", href: "/shared" };
  }
  return { label: "Drive của tôi", href: "/drive" };
}

function subjectCrumb(
  from: string | null,
  courseSlot: CatalogCourseSlot | undefined,
  courseSlotId: string,
): BreadcrumbItem | null {
  const code = courseSlot?.subject?.code;
  if (!code) return null;

  if (from === "public") {
    return { label: code };
  }

  return { label: code, href: `/drive/subject/${courseSlotId}` };
}

export function buildDocumentBreadcrumbs(options: {
  from: string | null;
  doc: DriveDocument | undefined;
  isLoading: boolean;
  folderPath: BreadcrumbItem[] | undefined;
  isFolderPathLoading: boolean;
  courseSlot: CatalogCourseSlot | undefined;
}): BreadcrumbItem[] {
  const {
    from,
    doc,
    isLoading,
    folderPath,
    isFolderPathLoading,
    courseSlot,
  } = options;

  const backRoot = documentBackRoot(from);
  const titleLabel = isLoading ? "…" : (doc?.title ?? "Tài liệu");

  if (!doc) {
    return [backRoot, { label: titleLabel }];
  }

  let middleCrumbs: BreadcrumbItem[] = [];

  if (doc.folderId) {
    if (isFolderPathLoading) {
      middleCrumbs = [{ label: "…" }];
    } else if (folderPath && folderPath.length > 0) {
      middleCrumbs = folderPath;
    }
  } else if (doc.courseSlotId) {
    const crumb = subjectCrumb(from, courseSlot, doc.courseSlotId);
    if (crumb) {
      middleCrumbs = [crumb];
    }
  }

  return [backRoot, ...middleCrumbs, { label: titleLabel }];
}
