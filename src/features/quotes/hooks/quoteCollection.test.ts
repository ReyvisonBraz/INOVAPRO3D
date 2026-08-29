import { describe, expect, it } from "vitest";
import type { Quote } from "../../../types/domain";
import { appendUniqueQuotes } from "./quoteCollection";

const quote = (id: string, total = 0) => ({ id, total }) as Quote;

describe("appendUniqueQuotes", () => {
  it("mantém a ordem da paginação e ignora IDs já carregados", () => {
    const result = appendUniqueQuotes(
      [quote("first", 10), quote("duplicate", 20)],
      [quote("duplicate", 999), quote("next", 30)],
    );

    expect(result.map((item) => [item.id, item.total])).toEqual([
      ["first", 10],
      ["duplicate", 20],
      ["next", 30],
    ]);
  });
});
