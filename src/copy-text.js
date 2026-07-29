function copyWithTemporarySelection(text, documentRef) {
  if (!documentRef?.body || typeof documentRef.execCommand !== "function") {
    return false;
  }

  const temporaryInput = documentRef.createElement("textarea");
  temporaryInput.value = text;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  temporaryInput.style.pointerEvents = "none";
  documentRef.body.append(temporaryInput);
  temporaryInput.select();

  try {
    return documentRef.execCommand("copy");
  } catch {
    return false;
  } finally {
    temporaryInput.remove();
  }
}

export async function copyText(
  text,
  clipboard = globalThis.navigator?.clipboard,
  documentRef = globalThis.document,
) {
  try {
    if (!clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await clipboard.writeText(text);
    return true;
  } catch {
    return copyWithTemporarySelection(text, documentRef);
  }
}
