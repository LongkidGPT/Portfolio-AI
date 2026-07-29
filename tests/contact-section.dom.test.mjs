import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let ContactSection;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ ContactSection } = await vite.ssrLoadModule(
    "/src/ContactSection.jsx",
  ));
});

test.after(async () => {
  await vite?.close();
});

function installDom() {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const copiedValues = [];

  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      async writeText(value) {
        copiedValues.push(value);
      },
    },
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  };

  for (const [name, value] of Object.entries(globals)) {
    previousGlobals[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true,
    });
  }

  return {
    copiedValues,
    restore() {
      dom.window.close();
      for (const [name, descriptor] of Object.entries(previousGlobals)) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

test("Contact WeChat copies the exact id and exposes visible feedback", async () => {
  const environment = installDom();
  const root = createRoot(document.querySelector("#root"));

  try {
    await act(async () => {
      root.render(React.createElement(ContactSection));
    });
    const button = document.querySelector(
      "[data-track-label='Wechat: LKchat1980']",
    );
    assert.ok(button);
    assert.match(button.textContent, /Wechat：LKchat1980/);

    await act(async () => {
      button.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true }),
      );
    });

    assert.deepEqual(environment.copiedValues, ["LKchat1980"]);
    assert.match(button.textContent, /已复制微信号/);
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});
