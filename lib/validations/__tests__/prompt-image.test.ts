import { describe, expect, it } from "vitest";
import {
  validateImageFile,
  extensionForMimeType,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PROMPT,
  uploadPromptImageSchema,
  deletePromptImageSchema,
  reorderPromptImagesSchema,
} from "../prompt-image";

function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a valid jpeg under the size limit", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1024);
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects a disallowed mime type", () => {
    const file = makeFile("doc.pdf", "application/pdf", 1024);
    expect(validateImageFile(file)).not.toBeNull();
  });

  it("rejects a file over the size limit", () => {
    const file = makeFile("huge.png", "image/png", MAX_IMAGE_SIZE_BYTES + 1);
    expect(validateImageFile(file)).not.toBeNull();
  });

  it("accepts a file exactly at the size limit", () => {
    const file = makeFile("exact.png", "image/png", MAX_IMAGE_SIZE_BYTES);
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects an empty file", () => {
    const file = makeFile("empty.png", "image/png", 0);
    expect(validateImageFile(file)).not.toBeNull();
  });

  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "accepts %s",
    (mime) => {
      const file = makeFile("f", mime, 100);
      expect(validateImageFile(file)).toBeNull();
    },
  );
});

describe("extensionForMimeType", () => {
  it("maps known mime types to extensions", () => {
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/webp")).toBe("webp");
    expect(extensionForMimeType("image/gif")).toBe("gif");
  });

  it("falls back to a generic extension for unknown types", () => {
    expect(extensionForMimeType("application/octet-stream")).toBe("bin");
  });
});

describe("schemas", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("uploadPromptImageSchema requires a valid promptId", () => {
    expect(
      uploadPromptImageSchema.safeParse({ promptId: validUuid }).success,
    ).toBe(true);
    expect(
      uploadPromptImageSchema.safeParse({ promptId: "nope" }).success,
    ).toBe(false);
  });

  it("deletePromptImageSchema requires a valid id", () => {
    expect(deletePromptImageSchema.safeParse({ id: validUuid }).success).toBe(
      true,
    );
    expect(deletePromptImageSchema.safeParse({ id: "nope" }).success).toBe(
      false,
    );
  });

  it("reorderPromptImagesSchema caps the array at MAX_IMAGES_PER_PROMPT", () => {
    const tooMany = Array.from({ length: MAX_IMAGES_PER_PROMPT + 1 }, () =>
      validUuid,
    );
    expect(
      reorderPromptImagesSchema.safeParse({
        promptId: validUuid,
        orderedImageIds: tooMany,
      }).success,
    ).toBe(false);

    const okMany = Array.from({ length: MAX_IMAGES_PER_PROMPT }, () => validUuid);
    expect(
      reorderPromptImagesSchema.safeParse({
        promptId: validUuid,
        orderedImageIds: okMany,
      }).success,
    ).toBe(true);
  });
});
