import { describe, expect, it } from "vitest";
import { omitUndefined } from "./_firestoreData";

describe("omitUndefined", () => {
  it("remove somente campos undefined", () => {
    expect(
      omitUndefined({ present: "value", absent: undefined, nullable: null, zero: 0, empty: "" }),
    ).toEqual({ present: "value", nullable: null, zero: 0, empty: "" });
  });
});
