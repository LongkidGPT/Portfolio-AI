export async function copyText(text, clipboard = navigator.clipboard) {
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
