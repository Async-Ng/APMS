import { useRouter } from "expo-router";
import { Alert } from "react-native";

import { type ActionItem } from "../components/app/ActionSheet";
import { type DriveDocument, type DriveFolder } from "./useDrive";
import { useDeleteDocument, useToggleDocumentStar } from "./useDocuments";
import { useDeleteFolder, useToggleFolderStar } from "./useFolders";

export type ShareTarget = { type: "folder" | "document"; id: string; name: string };
export type MoveTarget = {
  type: "folder" | "document";
  id: string;
  name: string;
  parentId: string | null;
};

export function useDriveItemActions(
  onShare: (target: ShareTarget) => void,
  onMove: (target: MoveTarget) => void,
  onEditTags: (doc: DriveDocument) => void,
) {
  const router = useRouter();
  const deleteFolder = useDeleteFolder();
  const toggleFolderStar = useToggleFolderStar();
  const deleteDocument = useDeleteDocument();
  const toggleDocumentStar = useToggleDocumentStar();

  function confirmDeleteFolder(folder: DriveFolder) {
    Alert.alert("Xóa thư mục này?", `Thư mục "${folder.name}" sẽ được chuyển vào thùng rác.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => deleteFolder.mutate(folder.id),
      },
    ]);
  }

  function confirmDeleteDocument(doc: DriveDocument) {
    Alert.alert("Xóa tài liệu này?", `Tài liệu "${doc.title}" sẽ được chuyển vào thùng rác.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => deleteDocument.mutate(doc.id),
      },
    ]);
  }

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
        label: "Di chuyển đến...",
        icon: "folder-open-outline",
        onPress: () =>
          onMove({ type: "folder", id: folder.id, name: folder.name, parentId: folder.parentId }),
      },
      {
        label: "Xóa",
        icon: "trash-outline",
        destructive: true,
        onPress: () => confirmDeleteFolder(folder),
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
        label: "Sửa thẻ",
        icon: "pricetag-outline",
        onPress: () => onEditTags(doc),
      },
      {
        label: "Di chuyển đến...",
        icon: "folder-open-outline",
        onPress: () =>
          onMove({ type: "document", id: doc.id, name: doc.title, parentId: doc.folderId }),
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
        onPress: () => confirmDeleteDocument(doc),
      },
    ];
  }

  return { buildFolderActions, buildDocumentActions };
}
