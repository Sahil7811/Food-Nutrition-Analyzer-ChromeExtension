chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetch_nutrition") {
    fetchNutritionDetails(request.product)
      .then((nutritionData) => sendResponse({ result: nutritionData }))
      .catch((error) => {
        console.error("Error:", error);
        sendResponse({ result: "Could not analyze product" });
      });
    return true; // Ensures async sendResponse works
  }
});

async function fetchNutritionDetails(product) {
  if (!product?.name) throw new Error("Invalid product name");

  const prompt = `Analyze the nutrition of this product :
  Name: ${product.name}
  Extract all information from its name and Check its ingrediants on internet and Provide a Nutri-Grade (A to E)
  Summarize its health benefits and risks, at the end of your response just give one word answer for each nutri grade :  and healthy : Yes/No
  "Analyze the following food product based on its name, ingredients, and nutritional content. Provide the response in this exact structured format:
1) "Product Details":
Product Name: [Product Name]
Description: [Short Description]
Category: [Food Category]
Brand (if available): [Brand Name]

2) "Ingredients List":
List all ingredients with their quantities (if available).
Highlight any artificial additives, preservatives, or allergens.

3) "Health Benefits & Risks":
List the key benefits of consuming this product.
Mention health risks (e.g., high sugar, artificial additives, allergens).

"Final Verdict":
Nutri-Grade: A/B/C/D/E
Healthy: Yes/No

final verdict should be dispalyed first.
Now, analyze this product and return the response in the format above:
and give all the info in a structured way with highlighted important text and provide the information in short and crisp manner`;

  try {
    const GEMINI_API_KEY = "API KEY"; // Replace with your actual API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini API Data:", data);

    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Unknown";

    const cleanText = (text) => {
      // Remove any asterisks used for bold formatting
      return text.replace(/\*/g, "");
    };
    text = cleanText(text);
    return text;
  } catch (error) {
    console.error("Fetch error:", error);
    return "API Error";
  }
}
