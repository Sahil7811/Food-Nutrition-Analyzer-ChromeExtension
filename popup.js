// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", () => {
  // Select UI elements
  const analyzeBtn = document.getElementById("analyzeBtn");
  const productInfo = document.getElementById("productInfo");
  const nutritionInfo = document.getElementById("nutritionInfo");

  // Add a click event listener to the analyze button
  analyzeBtn.addEventListener("click", async () => {
    try {
      // Show "Analyzing..." message while processing
      nutritionInfo.innerText = "Analyzing...";
      productInfo.innerText = "";
      analyzeBtn.disabled = true;

      // Retrieve the active tab in the current browser window
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Enhanced scraping script with more comprehensive data extraction
      const [{ result: productData }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Extract product name using various common selectors
          const productNameSelectors = [
            "h1",
            ".product-title",
            ".title",
            ".product-name",
            "[itemprop='name']",
            ".product_title",
            "#productTitle",
            ".product-info-name",
          ];

          let productName = "";
          for (const selector of productNameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
              productName = element.innerText.trim();
              break;
            }
          }

          // Extract product image
          const imageSelectors = [
            "[itemprop='image']",
            ".product-image img",
            ".primary-image",
            "#landingImage",
            ".product-main-image img",
          ];

          let productImage = "";
          for (const selector of imageSelectors) {
            const element = document.querySelector(selector);
            if (element && element.src) {
              productImage = element.src;
              break;
            }
          }

          // Extract product description
          const descriptionSelectors = [
            "[itemprop='description']",
            ".product-description",
            "#productDescription",
            ".description",
            ".product-info-description",
          ];

          let productDescription = "";
          for (const selector of descriptionSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
              productDescription = element.innerText.trim();
              break;
            }
          }

          // Extract brand information
          const brandSelectors = [
            "[itemprop='brand']",
            ".brand",
            ".product-brand",
            "#brand",
          ];

          let brand = "";
          for (const selector of brandSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
              brand = element.innerText.trim();
              break;
            }
          }

          // Look for nutrition table or data
          const nutritionTableSelectors = [
            ".nutrition-table",
            ".nutrition-info",
            ".nutritional-info",
            "[itemprop='nutrition']",
            ".nutrition-facts",
          ];

          let nutritionTableText = "";
          for (const selector of nutritionTableSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
              nutritionTableText = element.innerText.trim();
              break;
            }
          }

          // Extract ingredients with more comprehensive patterns
          let ingredientPatterns = [
            /ingredients?[:\s]+([\s\S]*?)(?:\n\n|\.\s|\.$|$)/i,
            /composition[:\s]+([\s\S]*?)(?:\n\n|\.\s|\.$|$)/i,
            /contains[:\s]+([\s\S]*?)(?:\n\n|\.\s|\.$|$)/i,
            /ingredients?[:\s]+((?:[^.,;]+,\s*)+[^.,;]+)/i,
          ];

          // Extract ingredients from specific elements first
          const ingredientSelectors = [
            "[itemprop='ingredients']",
            ".ingredients-list",
            ".ingredients",
            "#ingredients",
            ".product-ingredients",
          ];

          let ingredientList = "";
          for (const selector of ingredientSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
              ingredientList = element.innerText.trim();
              break;
            }
          }

          // If no ingredients found in specific elements, try regex patterns on page text
          if (!ingredientList) {
            // Get all visible text from the page
            const pageText = Array.from(
              document.querySelectorAll("p, li, td, div")
            )
              .map((el) => el.innerText)
              .join("\n");

            for (let pattern of ingredientPatterns) {
              let match = pageText.match(pattern);
              if (match) {
                ingredientList = match[1].trim();
                break;
              }
            }
          }

          // Look for allergy information
          const allergyPatterns = [
            /allerg[y|ies|ens][:\s]+([\s\S]*?)(?:\n\n|\.\s|\.$|$)/i,
            /contains[:\s]+((?:(?:tree )?nuts|milk|eggs|fish|shellfish|wheat|soy|peanuts)+)/i,
            /may contain[:\s]+([\s\S]*?)(?:\n\n|\.\s|\.$|$)/i,
          ];

          let allergyInfo = "";
          for (let pattern of allergyPatterns) {
            let match = document.body.innerText.match(pattern);
            if (match) {
              allergyInfo = match[1].trim();
              break;
            }
          }

          // Look for calorie and nutrition information in text
          const caloriePattern = /calories?[:\s]+(\d+)\s*(?:kcal)?/i;
          const proteinPattern = /protein[:\s]+(\d+(?:\.\d+)?)\s*g/i;
          const carbPattern = /carbohydrate[s]?[:\s]+(\d+(?:\.\d+)?)\s*g/i;
          const fatPattern = /fat[:\s]+(\d+(?:\.\d+)?)\s*g/i;
          const sugarPattern = /sugar[s]?[:\s]+(\d+(?:\.\d+)?)\s*g/i;
          const sodiumPattern = /sodium[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|g)/i;

          const calorieMatch = document.body.innerText.match(caloriePattern);
          const proteinMatch = document.body.innerText.match(proteinPattern);
          const carbMatch = document.body.innerText.match(carbPattern);
          const fatMatch = document.body.innerText.match(fatPattern);
          const sugarMatch = document.body.innerText.match(sugarPattern);
          const sodiumMatch = document.body.innerText.match(sodiumPattern);

          const nutritionValues = {
            calories: calorieMatch ? calorieMatch[1] : null,
            protein: proteinMatch ? proteinMatch[1] : null,
            carbs: carbMatch ? carbMatch[1] : null,
            fat: fatMatch ? fatMatch[1] : null,
            sugar: sugarMatch ? sugarMatch[1] : null,
            sodium: sodiumMatch ? sodiumMatch[1] : null,
          };

          // Try to determine if the product is vegan, gluten-free, or organic
          const isVegan = /vegan/i.test(document.body.innerText);
          const isGlutenFree = /gluten[- ]free/i.test(document.body.innerText);
          const isOrganic = /organic/i.test(document.body.innerText);

          // Return all extracted data
          return {
            name: productName || "Unknown Product",
            image: productImage,
            description: productDescription,
            brand: brand,
            ingredients: ingredientList || "Not Found",
            nutritionTable: nutritionTableText,
            nutritionValues: nutritionValues,
            allergyInfo: allergyInfo,
            dietary: {
              vegan: isVegan,
              glutenFree: isGlutenFree,
              organic: isOrganic,
            },
            pageTitle: document.title,
            url: window.location.href,
          };
        },
      });

      // Display basic product information
      if (!productData?.name || productData.name === "Unknown Product") {
        productInfo.innerHTML = `<strong>No specific product found.</strong><br>Analyzing page content: ${
          productData.pageTitle || "Unknown"
        }`;
      } else {
        productInfo.innerHTML = `<strong>Product:</strong> ${
          productData.name
        }<br>
    ${
      productData.brand
        ? `<strong>Brand:</strong> ${productData.brand}<br>`
        : ""
    }
    ${
      productData.description
        ? `<strong>Description:</strong> ${productData.description.substring(
            0,
            100
          )}${productData.description.length > 100 ? "..." : ""}<br>`
        : ""
    }`;
      }

      // Send complete product data to background script for analysis
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
