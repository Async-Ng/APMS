import { useRouter } from "expo-router";

import { type ActionItem } from "../components/app/ActionSheet";
import { type DriveDocument, type DriveFolder } from "./useDrive";
import { useDeleteDocument, useToggleDocumentStar } from "./useDocuments";
import { useDeleteFolder, useToggleFolderStar } from "./useFolders";

export type ShareTarget = { type: "folder" | "document"; id: string; name: string };

export function useDriveItemActions(onShare: (target: ShareTarget) => void) {
  const router = useRouter();
  const deleteFolder = useDeleteFolder();
  const toggleFolderStar = useToggleFolderStar();
  const deleteDocument = useDeleteDocument();
  const toggleDocumentStar = useToggleDocumentStar();

  function buildFolderActions(folder: DriveFolder): ActionItem[] {
    return [
      {
        label: folder.isStarred ? "Bỏ gắn sao" : "Gắn sao",
        icon: folder.isStarred ? "star" : "star-outline",
        onPress: () => toggleFolderStar.mutate({ id: folder.id, star: !folder.isStarred }),
      },
      {
        label: "Chia sẻ",
        icon: "share-outline",
        onPress: () => onShare({ type: "folder", id: folder.id, name: folder.name }),
      },
      {
        label: "Xóa",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteFolder.mutate(folder.id),
      },
    ];
  }

  function buildDocumentActions(doc: DriveDocument): ActionItem[] {
    return [
      {
        label: doc.isStarred ? "Bỏ gắn sao" : "Gắn sao",
        icon: doc.isStarred ? "star" : "star-outline",
        onPress: () => toggleDocumentStar.mutate({ id: doc.id, star: !doc.isStarred }),
      },
      {
        label: "Chia sẻ",
        icon: "share-outline",
        onPress: () => onShare({ type: "document", id: doc.id, name: doc.title }),
      },
      {
        label: "Trò chuyện về tài liệu này",
        icon: "chatbubble-outline",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/chat",
            params: { contextType: "document", contextId: doc.id, contextName: doc.title },
          }),
      },
      {
        label: "Xóa",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteDocument.mutate(doc.id),
      },
    ];
  }

  return { buildFolderActions, buildDocumentActions };
}
