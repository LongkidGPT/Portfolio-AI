export function resolvePageBackgroundMode(search = "") {
  return new URLSearchParams(search).get("bg") === "black"
    ? "black"
    : "off-black";
}

export function applyPageBackgroundMode(
  search = window.location.search,
  root = document.documentElement,
) {
  const mode = resolvePageBackgroundMode(search);
  root.dataset.pageBackground = mode;
  return mode;
}
