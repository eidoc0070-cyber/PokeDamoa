import { describe, expect, it, beforeEach } from "bun:test";
import { createAutocomplete } from "../../src/components/SearchAutocomplete.js";

describe("SearchAutocomplete", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    it("should update options dynamically using setOptions", () => {
        const data = [{ id: 1, name: "Test 1", search: "test1" }];
        const autocomplete = createAutocomplete({
            container,
            label: "Label",
            placeholder: "Placeholder",
            data,
            getSearchKey: (d: any) => d.search,
            getDisplayName: (d: any) => d.name,
            getDisplaySub: (d: any) => "sub",
            onSelect: () => {},
            getItemStyle: () => ({ color: "red" })
        });

        const input = container.querySelector("input") as HTMLInputElement;
        input.value = "test";
        input.dispatchEvent(new Event("input"));

        let item = container.querySelector(".autocomplete-item") as HTMLElement;
        expect(item.style.color).toBe("red");

        // 옵션 변경: 색상을 파란색으로
        autocomplete.setOptions({
            getItemStyle: () => ({ color: "blue" })
        });

        // 다시 렌더링 유도
        input.dispatchEvent(new Event("input"));
        item = container.querySelector(".autocomplete-item") as HTMLElement;
        expect(item.style.color).toBe("blue");
    });

    it("should update renderItemExtra dynamically", () => {
        const data = [{ id: 1, name: "Test 1", search: "test1" }];
        const autocomplete = createAutocomplete({
            container,
            label: "Label",
            placeholder: "Placeholder",
            data,
            getSearchKey: (d) => d.search,
            getDisplayName: (d) => d.name,
            getDisplaySub: (d) => "sub",
            onSelect: () => {},
            renderItemExtra: () => `<span class="extra-old">Old</span>`
        });

        const input = container.querySelector("input") as HTMLInputElement;
        input.value = "test";
        input.dispatchEvent(new Event("input"));

        expect(container.querySelector(".extra-old")).not.toBeNull();

        // 옵션 변경
        autocomplete.setOptions({
            renderItemExtra: () => `<span class="extra-new">New</span>`
        });

        input.dispatchEvent(new Event("input"));
        expect(container.querySelector(".extra-old")).toBeNull();
        expect(container.querySelector(".extra-new")).not.toBeNull();
    });
});
