import test from "node:test";
import assert from "node:assert/strict";
import { fitWithin } from "./image.js";

test("a large landscape photo is scaled so the long side is 1024", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1024, height: 768 });
});

test("a large portrait photo is scaled the same way", () => {
  assert.deepEqual(fitWithin(3000, 4000), { width: 768, height: 1024 });
});

test("a small picture is never enlarged", () => {
  assert.deepEqual(fitWithin(300, 200), { width: 300, height: 200 });
});

test("a picture exactly at the limit is unchanged", () => {
  assert.deepEqual(fitWithin(1024, 512), { width: 1024, height: 512 });
});

test("a very thin picture keeps at least one pixel", () => {
  const out = fitWithin(10000, 1);
  assert.equal(out.width, 1024);
  assert.equal(out.height, 1);
});

test("a custom maximum is respected", () => {
  assert.deepEqual(fitWithin(2000, 1000, 500), { width: 500, height: 250 });
});
