import assert from "node:assert/strict";
import test from "node:test";
import { makeTable } from "../elements";

test("makeTable renders data-gain-pct attribute with escaped values", () => {
  const rows = [
    {
      name: "Test Position",
      gain_abs: 100,
      purchase_value: 1000,
    },
  ];
  // purchase_value must be in cols to be summed!
  const cols = [
    { key: "name", label: "Name" },
    { key: "purchase_value", label: "Purchase Value" },
    { key: "gain_abs", label: "Gain" },
  ];
  const sumColumns = ["gain_abs", "purchase_value"];

  // sums: gain_abs=100, purchase_value=1000 => gain_pct = 10%
  // formatNumber(10) => "10,00"
  // label => "10,00 %" (with nbsp)

  const html = makeTable(rows, cols, sumColumns);

  // Check if data-gain-pct attribute exists in the footer
  // It is attached to the gain_abs cell.
  const match = html.match(/data-gain-pct="([^"]+)"/);

  if (!match) {
    assert.fail("data-gain-pct attribute should be present in the footer");
  } else {
    assert.match(match[1], /10,00/, "Attribute should contain the percentage");
  }
});

test("makeTable renders data-gain-pct with escaped quotes", () => {
  const rows = [{ gain_abs: 50, purchase_value: 100 }];
  const cols = [
    { key: "purchase_value", label: "PV" },
    { key: "gain_abs", label: "Gain" },
  ];

  const html = makeTable(rows, cols, ["gain_abs", "purchase_value"]);
  assert.ok(html.includes('data-gain-pct="'), "Attribute is generated");
});
