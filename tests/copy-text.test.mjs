import assert from "node:assert/strict";
import test from "node:test";

import { copyText } from "../src/copy-text.js";

test("copy action writes the exact portfolio contact value", async () => {
  let written = "";
  const copied = await copyText("LKchat1980", {
    async writeText(value) {
      written = value;
    },
  });

  assert.equal(copied, true);
  assert.equal(written, "LKchat1980");
});

test("copy action reports failure when clipboard access is denied", async () => {
  const copied = await copyText("long.kidq@gmail.com", {
    async writeText() {
      throw new Error("denied");
    },
  });

  assert.equal(copied, false);
});
