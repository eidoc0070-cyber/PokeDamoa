import { describe, expect, test } from "bun:test";
import { parseCSVContent } from "../../scripts/build-data.js";

describe("parseCSVContent", () => {
    test("parses standard CSV rows", () => {
        const csv = "id,name,desc\n1,pound,Normal attack\n2,karate-chop,Fighting attack\n";
        const result = parseCSVContent(csv);
        expect(result).toEqual([
            { id: "1", name: "pound", desc: "Normal attack" },
            { id: "2", name: "karate-chop", desc: "Fighting attack" },
        ]);
    });

    test("preserves newlines and commas inside quoted fields", () => {
        const csv = [
            "move_id,version_group_id,language_id,flavor_text",
            '1,20,3,"긴 꼬리나 손 등을 사용하여\n상대를 때려서 공격한다."',
            '2,20,3,"날카로운 당수로, 상대를\n베어 갈라서 공격한다."',
        ].join("\n");

        const result = parseCSVContent(csv);
        expect(result).toHaveLength(2);
        expect(result[0].flavor_text).toBe("긴 꼬리나 손 등을 사용하여\n상대를 때려서 공격한다.");
        expect(result[1].flavor_text).toBe("날카로운 당수로, 상대를\n베어 갈라서 공격한다.");
    });

    test("handles escaped quotes and CRLF line endings", () => {
        const csv = 'id,text\r\n1,"He said ""hello""\r\nworld"\r\n';
        const result = parseCSVContent(csv);
        expect(result).toEqual([{ id: "1", text: 'He said "hello"\r\nworld' }]);
    });
});
