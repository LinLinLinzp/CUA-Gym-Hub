import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Button, Popover, Menu } from "../src/components/UI.jsx";

export async function runReviewChecks() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const click = (el) =>
    act(async () => {
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.click();
    });
  let canceled = false,
    cleared = false,
    saved = false,
    edited = false;
  const rect = HTMLElement.prototype.getBoundingClientRect;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  try {
    await act(async () =>
      root.render(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saved = true;
          }}
        >
          <input defaultValue="3h 30m" />
          <Button
            onClick={() => {
              canceled = true;
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              cleared = true;
            }}
          >
            Clear
          </Button>
          <Button type="submit">Save</Button>
        </form>,
      ),
    );
    const buttons = [...container.querySelectorAll("button")];
    assert(
      buttons.map((b) => b.type).join() === "button,button,submit",
      "Implicit submission could invoke Cancel or Clear",
    );
    await act(async () =>
      container
        .querySelector("form")
        .requestSubmit(buttons.find((b) => b.type === "submit")),
    );
    assert(
      saved && !canceled && !cleared,
      "Form submission invoked a destructive secondary action",
    );

    for (const [width, height] of [
      [1440, 900],
      [1280, 720],
    ]) {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: height,
      });
      HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.classList.contains("popover-anchor"))
          return {
            left: width - 100,
            right: width - 20,
            top: height - 80,
            bottom: height - 40,
            width: 80,
            height: 40,
          };
        if (this.classList.contains("popover"))
          return { width: 320, height: 240 };
        return rect.call(this);
      };
      await act(async () =>
        root.render(
          <Popover key={width} trigger="Bulk priority" label="Bulk picker">
            <Menu
              label="Entry menu"
              items={[
                {
                  label: "Edit entry",
                  onClick: () => {
                    edited = true;
                  },
                },
              ]}
            />
          </Popover>,
        ),
      );
      await click(container.querySelector("button"));
      const outer = document.querySelector(
        '[aria-label="Bulk picker"].popover',
      );
      assert(
        outer.style.bottom === "85px",
        `Bottom popover did not flip at ${width}×${height}`,
      );
      assert(
        Number.parseInt(outer.style.left) === width - 328,
        "Popover extends beyond the right edge",
      );
      await click(outer.querySelector("button"));
      const inner = document.querySelector('[aria-label="Entry menu"].popover');
      await click(inner.querySelector("button"));
      assert(
        edited && outer.isConnected && !inner.isConnected,
        "Nested menu mousedown unmounted its parent before click",
      );
      await act(async () =>
        document.body.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true }),
        ),
      );
      assert(!outer.isConnected, "Outside click did not dismiss the popover");
      edited = false;
    }
  } finally {
    HTMLElement.prototype.getBoundingClientRect = rect;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: viewport.width,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: viewport.height,
    });
    await act(async () => root.unmount());
    container.remove();
  }
  return 10;
}
