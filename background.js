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

  const prompt = `
  **🔍 Final Verdict:**  
  - **Nutri-Grade:** [A / B / C / D / E]  
  - **Healthy:** [Yes / No]  

  ---  

  **🥡 Product Details:**  
  - **Name:** ${product.name}  
  - **Description:** [Short description based on product type]  
  - **Category:** [Food category]  
  - **Brand:** [Brand Name, if available]  

  ---  

  **📋 Ingredients List:**  
- **Primary Ingredient:** [Quantity (if available)] - [Remarks: Additives, Preservatives, Allergens]  
- **Secondary Ingredient:** [Quantity (if available)] - [Remarks]  
- **Sweeteners & Sugars:** [Quantity] - [E.g., "Refined Sugar, Artificial Sweeteners (Aspartame)"]  
- **Fats & Oils:** [Quantity] - [E.g., "Palm Oil (High Saturated Fat), Sunflower Oil (Healthier Alternative)"]  
- **Artificial Additives & Preservatives:** [If present] - [E.g., "MSG, Artificial Colors (E150d), Preservatives (Sodium Benzoate)"]  
- **Acidity Regulators & Stabilizers:** [If present] - [E.g., "Citric Acid (E330), Xanthan Gum (E415)"]  
- **Protein Sources:** [Quantity] - [E.g., "Soy Protein, Whey Protein, Casein"]  
- **Vegetable & Fruit Content:** [If applicable] - [E.g., "Dehydrated Vegetables (Carrot, Peas, Tomato Powder)"]  
- **Dietary Fiber & Whole Grains:** [If applicable] - [E.g., "Oats, Whole Wheat, Psyllium Husk"]  
- **Flavor Enhancers:** [If applicable] - [E.g., "Natural & Artificial Flavors (Vanilla Extract, Ethyl Vanillin)"]  

*(More ingredients if available...)* 

  ---  

  **⚠️ Allergy Information:**  
  - 🚨 **Contains:** [List of allergens, e.g., gluten, dairy, nuts, soy]  
  - ⚠️ **May contain traces of:** [Possible cross-contaminants]  

  ---  

  **🍽️ Nutritional Information (Per 100g / Per Serving):**  
  - Calories: [XXX kcal]  
  - Protein: [Xg]  
  - Carbohydrates: [Xg]  
  - Sugars: [Xg]  
  - Fat: [Xg]  
  - Saturated Fat: [Xg]  
  - Fiber: [Xg]  
  - Sodium: [Xmg]   
   and more Nutrients if available

  ---  

  **🚦 Glycemic Index & Blood Sugar Impact:**  
  - **Glycemic Index (GI):** [Low / Medium / High]  
  - **Glycemic Load (GL):** [Low / Medium / High]  
  - **Impact on Blood Sugar:** [Short description]  

  ---  

  **💪 Fitness & Muscle Building Suitability:**  
  - ✅ **High-Protein:** Yes/No  
  - ✅ **Good for Pre/Post-Workout:** Yes/No  
  - ✅ **Affects Hydration Levels:** Yes/No  

  ---  

  **👶👴 Suitability for Age Groups:**  
  - ✅ **Safe for Children?** Yes/No (Reason)  
  - ✅ **Safe for Elderly?** Yes/No (Reason)  

  ---  

  **⚗️ Additives & Preservatives Score:**  
  - **Artificial Additives:** Low/Medium/High  
  - **Preservatives Used:** [List]  
  - **Artificial Colors & Flavors:** Yes/No  

  ---  

  **🍃 Health Insights:**  
  **✔️ Benefits:**  
  - ✅ [Benefit 1]  
  - ✅ [Benefit 2]  
  - ✅ [Benefit 3]  

  **⚠️ Risks:**  
  - ⚠️ [Risk 1]  
  - ⚠️ [Risk 2]  
  - ⚠️ [Risk 3]  

  ---  

  **📊 Recommended Consumption & Alternatives:**  
  - 🕒 **Recommended Consumption:** [e.g., "Safe for daily intake" / "Best in moderation" / "Occasional treat"]  
  - 🔄 **Healthier Alternatives:** [Suggestions, if applicable]  

  ---  

  **🌍 Carbon Footprint & Sustainability:**  
  - 🌱 **Sustainable Farming:** Yes/No  
  - 🛢️ **Carbon Footprint Level:** Low/Medium/High  
  - 🥤 **Eco-Friendly Packaging:** Yes/No  

  ---  

  **💰 Cost & Value for Money:**  
  - **Price Range:** [Budget / Mid-Range / Premium]  
  - **Cost per 100g / Serving:** [$X.XX]  
  - **Worth the Price?** Yes/No  

  ---  

  **🍃 Suitability for Diets & Lifestyles:**  
  - ✅ **Vegan:** Yes/No  
  - ✅ **Gluten-Free:** Yes/No  
  - ✅ **Keto-Friendly:** Yes/No  

  *(Disclaimer: Analysis is based on general food knowledge. For precise details, refer to product packaging.)*
  `;

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
