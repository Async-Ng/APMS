import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ documentId: string }>;
}

/** The dedicated public-document detail route was consolidated into
 *  `/documents/[id]`. Keep this path working for old links/bookmarks. */
export default async function ForumDocumentRedirect({ params }: PageProps) {
  const { documentId } = await params;
  redirect(`/documents/${documentId}?from=public`);
}
