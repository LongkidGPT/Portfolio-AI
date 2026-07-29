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

test("copy action falls back to a temporary selection when clipboard access is denied", async () => {
  let selectedValue = "";
  let removed = false;
  const temporaryInput = {
    value: "",
    setAttribute() {},
    select() {
      selectedValue = this.value;
    },
    remove() {
      removed = true;
    },
    style: {},
  };
  const documentRef = {
    body: {
      append() {},
    },
    createElement(tagName) {
      assert.equal(tagName, "textarea");
      return temporaryInput;
    },
    execCommand(command) {
      assert.equal(command, "copy");
      return true;
    },
  };

  const copied = await copyText(
    "LKchat1980",
    {
      async writeText() {
        throw new Error("denied");
      },
    },
    documentRef,
  );

  assert.equal(copied, true);
  assert.equal(selectedValue, "LKchat1980");
  assert.equal(removed, true);
});
