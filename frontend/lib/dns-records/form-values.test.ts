import {
  CREATABLE_DNS_RECORD_TYPES,
  parseRecordValues,
  RECORD_TYPE_HELP,
} from "./form-values";

describe("DNS record form values", () => {
  it("removes empty lines and stably deduplicates exact trimmed values", () => {
    expect(
      parseRecordValues(" 192.0.2.10 \n\n192.0.2.11\n192.0.2.10 "),
    ).toEqual(["192.0.2.10", "192.0.2.11"]);
  });

  it("preserves spaces and quotes inside values", () => {
    expect(
      parseRecordValues('10 mail.example.com.\n0 issue "letsencrypt.org"'),
    ).toEqual(["10 mail.example.com.", '0 issue "letsencrypt.org"']);
  });

  it("offers all nine creatable types and excludes SOA", () => {
    expect(CREATABLE_DNS_RECORD_TYPES).toHaveLength(9);
    expect(CREATABLE_DNS_RECORD_TYPES).not.toContain("SOA");
    expect(Object.keys(RECORD_TYPE_HELP)).toEqual([
      ...CREATABLE_DNS_RECORD_TYPES,
    ]);
  });
});
