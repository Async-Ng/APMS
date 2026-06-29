import type { LucideIcon } from "lucide-react";
import { File, FileImage, FileSpreadsheet, FileText, Presentation } from "lucide-react";

export interface FileIconStyle {
  Icon: LucideIcon;
  bgClass: string;
  iconClass: string;
}

export function getFileIconStyle(mimeType: string | undefined): FileIconStyle {
  const mime = mimeType ?? "";

  if (mime.includes("pdf")) {
    return {
      Icon: FileText,
      bgClass: "bg-red-100",
      iconClass: "text-red-600",
    };
  }
  if (mime.includes("wordprocessingml") || mime.includes("msword")) {
    return {
      Icon: FileText,
      bgClass: "bg-blue-100",
      iconClass: "text-blue-600",
    };
  }
  if (mime.includes("presentationml") || mime.includes("powerpoint")) {
    return {
      Icon: Presentation,
      bgClass: "bg-orange-100",
      iconClass: "text-orange-600",
    };
  }
  if (mime.includes("spreadsheetml") || mime.includes("excel")) {
    return {
      Icon: FileSpreadsheet,
      bgClass: "bg-green-100",
      iconClass: "text-green-600",
    };
  }
  if (mime.startsWith("image/")) {
    return {
      Icon: FileImage,
      bgClass: "bg-purple-100",
      iconClass: "text-purple-600",
    };
  }

  return {
    Icon: File,
    bgClass: "bg-brutal-bg",
    iconClass: "text-brutal-muted",
  };
}
