// Listen for messages from other parts of the Chrome extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the received message has an action to fetch nutrition details
  if (request.action === "fetch_nutrition") {
    // Call the function to fetch nutrition details and handle the response
    fetchNutritionDetails(request.product)
      .then((nutritionData) => sendResponse({ result: nutritionData })) // Send the fetched data back to the sender
      .catch((error) => {
        console.error("Error:", error); // Log any errors
        sendResponse({ result: "Could not analyze product" }); // Send an error response
      });

    return true; // Keeps the connection alive for async `sendResponse`
  }
});

// Enhanced function to fetch nutrition details using the Gemini API
async function fetchNutritionDetails(product) {
  // Ensure there's at least some product data before making an API call
  if (!product) throw new Error("Invalid product data");

  // Create a more detailed prompt based on all the scraped data
  const prompt = `
  Analyze the following food product and provide a detailed nutritional assessment.
  - Name: ${product.name || "Unknown"}
  - Brand: ${product.brand || "Not Specified"}
  - Description: ${product.description || "Not Available"}
  - URL: ${product.url || "Not Available"}
  
  **Ingredients:**
  ${product.ingredients || "No ingredient information found."}
  
  **Nutrition Information:**
  ${product.nutritionTable || ""}
  
  ${
    product.nutritionValues?.calories
      ? `- Calories: ${product.nutritionValues.calories} kcal`
      : ""
  }
  ${
    product.nutritionValues?.protein
      ? `- Protein: ${product.nutritionValues.protein}g`
      : ""
  }
  ${
    product.nutritionValues?.carbs
      ? `- Carbohydrates: ${product.nutritionValues.carbs}g`
      : ""
  }
  ${
    product.nutritionValues?.fat ? `- Fat: ${product.nutritionValues.fat}g` : ""
  }
  ${
    product.nutritionValues?.sugar
      ? `- Sugar: ${product.nutritionValues.sugar}g`
      : ""
  }
  ${
    product.nutritionValues?.sodium
      ? `- Sodium: ${product.nutritionValues.sodium}mg`
      : ""
  }
  
  **Allergy Information:**
  ${product.allergyInfo || "No specific allergy information found."}
  
  **Dietary Preferences:**
  - Appears to be Vegan: ${product.dietary?.vegan ? "Yes" : "No indication"}
  - Appears to be Gluten-Free: ${
    product.dietary?.glutenFree ? "Yes" : "No indication"
  }
  - Appears to be Organic: ${product.dietary?.organic ? "Yes" : "No indication"}

  Based on all available information, please provide a comprehensive nutrition analysis with the following:

  **🔍 Final Verdict:**  
  - **Nutri-Grade:** [A / B / C / D / E]  
  - **Healthy:** [Yes / No]  
  note: in final verdict do not provide information only provide the score and is it healthy or not
  ---  

  **🥡 Product Details:**  
  - **Name:** ${product.name}  
  - **Description:** [Short description based on product type]  
  - **Category:** [Food category]  
  - **Brand:** ${product.brand || "[Brand Name if detected]"}  

  ---  

  **📋 Ingredients Analysis:**  
  - [Analysis of key ingredients, additives, and their health implications]
  - [Analysis of sweeteners, sugars, oils, preservatives, etc.]

  ---  

  **⚠️ Allergy Information:**  
  - 🚨 **Contains:** [List of detected allergens]  
  - ⚠️ **May contain traces of:** [Possible cross-contaminants if mentioned]  

  ---  

  **🍽️ Nutritional Value Assessment:**  
  - [Analysis of calories, protein, carbs, fats, etc.]
  - [Evaluation of nutritional balance]

  ---  

  **🚦 Glycemic Index & Blood Sugar Impact:**  
  - **Expected Glycemic Impact:** [Low / Medium / High]
  - **Impact on Blood Sugar:** [Brief assessment]

  ---  

  **💪 Fitness & Health Relevance:**  
  - **Suitable for muscle building:** [Yes/No/Maybe]
  - **Good for weight management:** [Yes/No/Maybe]

  ---  

  **🍃 Health Insights:**  
  **✔️ Benefits:**  
  - [List main health benefits if any]

  **⚠️ Concerns:**  
  - [List main health concerns if any]

  ---  

  **📊 Consumption Advice:**  
  - 🕒 **Recommended Consumption Pattern:** [e.g., "Daily", "Occasional", "Limit intake"]
  - 🔄 **Healthier Alternatives:** [Suggestions if applicable]

  Note: If information is missing or incomplete, make reasonable assessments based on similar products, but indicate that this is an estimate.
  add this line at the end : *(Disclaimer: The analysis is based solely on the information provided on the food product packaging.)*
  `;

  try {
    // Define API key for Gemini AI model (Replace with actual API key)
    const GEMINI_API_KEY = API_KEY;

    // Make a request to the Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST", // Use POST method
        headers: { "Content-Type": "application/json" }, // Set content type to JSON
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }], // Send the formatted prompt
          // Add parameters to improve response
          generationConfig: {
            temperature: 0.2, // Lower temperature for more factual responses
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`); // Throw an error if the request fails
    }

    // Parse the response JSON
    const data = await response.json();
    console.log("Gemini API Data:", data); // Log API response for debugging

    // Extract the generated text response
    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Could not generate nutrition analysis.";

    // Function to clean the text (removes asterisks used for formatting)
    const cleanText = (text) => {
      return text.replace(/\*/g, ""); // Remove asterisks from text
    };

    text = cleanText(text); // Apply text cleaning

    // Return fallback message if the scraped data is very limited
    if (
      (!product.ingredients || product.ingredients === "Not Found") &&
      !product.nutritionTable &&
      !Object.values(product.nutritionValues || {}).some((v) => v)
    ) {
      return `Limited product information available for ${
        product.name || "this product"
      }. 
              Please try on a product details page with more nutritional information.`;
    }

    return text; // Return the processed response
  } catch (error) {
    console.error("Fetch error:", error); // Log any errors
    return "API Error: Could not analyze product nutrition. Please check your API key and network connection.";
  }
}
