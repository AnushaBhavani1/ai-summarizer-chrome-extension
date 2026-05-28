document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("api-key");

  chrome.storage.sync.get(["geminiApiKey"], (res) => {
    if (res.geminiApiKey) {
      input.value = res.geminiApiKey;
    }
  });

  document.getElementById("save-button").addEventListener("click", () => {
    chrome.storage.sync.set(
      { geminiApiKey: input.value },
      () => alert("Saved!")
    );
  });
});