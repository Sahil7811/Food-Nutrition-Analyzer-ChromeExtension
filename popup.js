document.addEventListener("DOMContentLoaded", () => {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const productInfo = document.getElementById("productInfo");
  const nutritionInfo = document.getElementById("nutritionInfo");

  analyzeBtn.addEventListener("click", async () => {
    try {
      nutritionInfo.innerText = "Analyzing...";
      productInfo.innerText = "";
      analyzeBtn.disabled = true;

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const [{ result: productData }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          let productName =
            document.querySelector("h1, .product-title, .title, .product-name")
              ?.innerText || "";

          let ingredientPatterns = [
            /ingredients?:\s*([\s\S]*?)(?:\n|$)/i,
            /composition:\s*([\s\S]*?)(?:\n|$)/i,
            /contains:\s*([\s\S]*?)(?:\n|$)/i,
          ];

          let ingredientList = "Not Found";
          for (let pattern of ingredientPatterns) {
            let match = document.body.innerText.match(pattern);
            if (match) {
              ingredientList = match[1].trim();
              break;
            }
          } 

          return { name: productName.trim(), ingredients: ingredientList };
        },
      });

      if (!productData?.name) {
        nutritionInfo.innerText = "No product information found on this page.";
        analyzeBtn.disabled = false;
        return;
      }

      productInfo.innerText = `Product : ${productData.name}`;

      chrome.runtime.sendMessage(
        { action: "fetch_nutrition", product: productData },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Message Error:", chrome.runtime.lastError.message);
            nutritionInfo.innerText =
              "Error communicating with background script.";
          } else {
            console.log("Received response:", response);
            nutritionInfo.innerText = response?.result || "Unknown response.";
          }
          analyzeBtn.disabled = false;
        }
      );
    } catch (error) {
      console.error("Error:", error);
      nutritionInfo.innerText = `Error: ${error.message}`;
      analyzeBtn.disabled = false;
    }
  });
});
