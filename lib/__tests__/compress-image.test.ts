import { describe, expect, it, vi } from "vitest";

// browser-image-compression relies on browser-only APIs (canvas, Worker)
// that don't exist in vitest's default Node environment. We only test
// the pass-through branches of compressImageForUpload here (GIFs, and
// files already comfortably under the size limit) since those never
// call into the library at all. The actual compression path is exercised
// manually in a real browser as part of testing the image upload feature
// end-to-end (see README's "Status of this build" section).
vi.mock("browser-image-compression", () => ({
  default: vi.fn(() => {
    throw new Error("should not be called for pass-through cases");
  }),
}));

const { compressImageForUpload } = await import("../compress-image");
const { MAX_IMAGE_SIZE_BYTES } = await import("../validations/prompt-image");

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("compressImageForUpload", () => {
  it("passes GIFs through unmodified (never flattens animation)", async () => {
    const file = makeFile("anim.gif", "image/gif", MAX_IMAGE_SIZE_BYTES * 2);
    const result = await compressImageForUpload(file);
    expect(result).toBe(file);
  });

  it("passes through a file already comfortably under the size limit", async () => {
    const smallFile = makeFile(
      "small.png",
      "image/png",
      Math.floor(MAX_IMAGE_SIZE_BYTES * 0.1),
    );
    const result = await compressImageForUpload(smallFile);
    expect(result).toBe(smallFile);
  });
});
