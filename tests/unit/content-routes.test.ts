import { describe, expect, it } from "vitest"
import { categoryHref, tagHref, termRouteParam } from "@/lib/content-routes"

describe("content route params", () => {
  it("keeps term params in one safe path segment", () => {
    expect(termRouteParam("Life/Work #1? 100%")).toBe(
      "t_Life~2FWork~20~231~3F~20100~25",
    )
    expect(termRouteParam("..")).toBe("t_~2E~2E")
    expect(termRouteParam("tilde~value")).toBe("t_tilde~7Evalue")
  })

  it("uses the same param encoding for category and tag links", () => {
    expect(categoryHref("Life/Work")).toBe("/categories/t_Life~2FWork/")
    expect(tagHref("Life/Work")).toBe("/tags/t_Life~2FWork/")
  })
})
