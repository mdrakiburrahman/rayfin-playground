import { describe, expect, it } from "vitest";

import { shouldUseLocalDevRuntime } from "@/lib/runtime-mode";

describe("shouldUseLocalDevRuntime", () => {
    it("uses the local runtime only for a top-level development page", () => {
        expect(shouldUseLocalDevRuntime(true, true)).toBe(true);
        expect(shouldUseLocalDevRuntime(true, false)).toBe(false);
        expect(shouldUseLocalDevRuntime(false, true)).toBe(false);
        expect(shouldUseLocalDevRuntime(false, false)).toBe(false);
    });
});
