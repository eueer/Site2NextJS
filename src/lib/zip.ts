import JSZip from "jszip";
import { ProjectFile } from "./types";

export async function createProjectZip(files: ProjectFile[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    if (typeof file.content === "string") {
      zip.file(file.path, file.content);
    } else if (file.binary) {
      zip.file(file.path, file.binary);
    }
  }

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return content;
}
