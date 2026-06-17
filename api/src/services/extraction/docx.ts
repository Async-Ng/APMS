import mammoth from "mammoth";

import { loadEnv } from "../../config/env";
import type { ExtractionResult } from "../extraction.service";
import { describeImages, imageDescriptionsBlock, type ImageInput } from "./vision-ocr";

export async function extractDocxWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const env = loadEnv();

  const textResult = await mammoth.extractRawText({ buffer });
  const body = textResult.value;

  if (!env.DOC_VISION_ENABLED) {
    return { text: body, pageCount: null };
  }

  // Collect embedded images via a separate convertToHtml pass. The convertImage hook
  // fires for every image; we capture the buffer and discard the produced HTML.
  const images: ImageInput[] = [];
  await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        if (images.length < env.DOC_VISION_MAX_IMAGES) {
          const base64 = await image.read("base64");
          images.push({ base64, mime: image.contentType ?? "image/png" });
        }
        return { src: "" }; // HTML output is discarded; we only want the side-effect collection
      }),
    },
  );

  const descriptions = await describeImages(images);
  const text = `${body}${imageDescriptionsBlock(descriptions)}`;
  return { text, pageCount: null };
}
