document.getElementById("summarize").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "Loading...";

  const summaryType = document.getElementById("summary-type").value;

  // 1. Get API key
  chrome.storage.sync.get(["geminiApiKey"], (store) => {
    if (!store.geminiApiKey) {
      resultDiv.innerText = "API key not found. Please set it in options.";
      return;
    }

    // 2. Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) {
        resultDiv.innerText = "No active tab found.";
        return;
      }

      // 3. Send message to content script
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          // ❌ FIX: runtime error handling
          if (chrome.runtime.lastError) {
            console.error("Content script error:", chrome.runtime.lastError.message);
            resultDiv.innerText =
              "❌ Content script not running on this page.\nRefresh the page or open a normal article page.";
            return;
          }

          if (!res || !res.text) {
            resultDiv.innerText = "Could not extract article text.";
            return;
          }

          try {
            const summary = await getGeminiSummary(
              res.text,
              summaryType,
              store.geminiApiKey
            );

            resultDiv.innerText = summary;
          } catch (error) {
            console.error("Gemini error:", error);
            resultDiv.innerText = "Error: " + error.message;
          }
        }
      );
    });
  });
});


// COPY BUTTON
document.getElementById("copy-btn").addEventListener("click", () => {
  const text = document.getElementById("result").innerText;

  if (text && text.trim() !== "") {
    navigator.clipboard.writeText(text);
  }
});


// 🔥 GEMINI API FUNCTION
async function getGeminiSummary(text, summaryType, apiKey) {
  const maxLength = 8000;

  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) : text;

  console.log("Sending text length:", truncatedText.length);

  let prompt = "";

  if (summaryType === "brief") {
    prompt = `Summarize in 2-3 lines:\n\n${truncatedText}`;
  } else if (summaryType === "detailed") {
    prompt = `Give a detailed summary:\n\n${truncatedText}`;
  } else {
    prompt = `Give bullet points summary:\n\n${truncatedText}`;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "API request failed");
  }

  const data = await res.json();

  console.log("Gemini Response:", data);

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response from Gemini"
  );
}