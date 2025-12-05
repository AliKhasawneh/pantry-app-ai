import { Mistral } from '@mistralai/mistralai';

// Initialize the Mistral client
const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  console.warn('⚠️  MISTRAL_API_KEY not set. AI features will be disabled.');
}

const client = apiKey ? new Mistral({ apiKey }) : null;

// Available models: mistral-small-latest, mistral-medium-latest, mistral-large-latest, open-mistral-7b, open-mixtral-8x7b
const DEFAULT_MODEL = 'mistral-small-latest';

// Generate text from a prompt
export async function generateText(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
  if (!client) {
    throw new Error('Mistral API not configured. Set MISTRAL_API_KEY environment variable.');
  }

  const response = await client.chat.complete({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from Mistral');
  }
  
  return typeof content === 'string' ? content : JSON.stringify(content);
}


// Recipe structure for structured responses
export interface RecipeSuggestion {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  optional?: string[];
}

// Pantry-specific: Suggest recipes based on available items (structured JSON)
export async function suggestRecipes(items: string[]): Promise<RecipeSuggestion[]> {
  if (items.length === 0) {
    return [];
  }

  const prompt = `I have these ingredients in my pantry: ${items.join(', ')}.

Please suggest 3 simple recipes I can make with these ingredients. Do not suggest recipes that require ingredients that are not in my pantry.

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "optional": ["optional ingredient 1"]
  }
]`;

  const response = await generateText(prompt);
  
  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const recipes = JSON.parse(jsonMatch[0]) as Array<Omit<RecipeSuggestion, 'id'>>;
      return recipes.map((r, i) => ({
        ...r,
        id: `ai-${Date.now()}-${i}`,
      }));
    }
  } catch (e) {
    console.error('Failed to parse recipes JSON:', e);
  }
  
  return [];
}

// Pantry-specific: Suggest recipes based on available items
export async function filterIngredients(items: string[]): Promise<string> {
  if (items.length === 0) {
    return 'No items in your pantry to filter.';
  }

  const prompt = `You are given a list of pantry ingredients.  
  Select the one ingredient that best serves as a main ingredient for a meal.  
  Choose the most substantial item.  
  Proteins have highest priority, then starchy bases, then vegetables.  
  Ignore snacks and condiments.

  Pantry: ${items.join(', ')}

  Return only one word that identifies the primary ingredient to use for a recipe search.
  `;

  return generateText(prompt);
}


// Pantry-specific: Choose from MealDB recipes (structured JSON)
export async function suggestFromRecipes(
  recipes: string[], 
  pantryItems: string[],
  dislikedRecipes: string[] = []
): Promise<RecipeSuggestion[]> {
  if (recipes.length === 0) {
    return [];
  }

  const dislikedSection = dislikedRecipes.length > 0
    ? `\n\nDO NOT suggest any of these disliked recipes: ${dislikedRecipes.join(', ')}`
    : '';

  const prompt = `Given the following recipes: ${recipes.join(', ')}
  
My pantry contains: ${pantryItems.join(', ')}${dislikedSection}

Identify all proteins in my pantry. Proteins are items such as chicken, beef, pork, fish, eggs, turkey, lamb, tofu and similar.

Identify all bases in my pantry. Bases are items such as rice, pasta, noodles, bread, tortillas, potatoes and similar.

When generating recipes:
1. Use as many different proteins as possible before repeating any protein.
2. Use as many different bases as possible before repeating any base.
3. You must generate the requested number of recipes.
Choose 4-5 recipes that can be made with what is in my pantry. 
If spices, herbs or toppings aren't in my pantry, suggest the recipe anyways.
If none can be made, return an empty array [].

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "optional": ["optional ingredient 1"]
  }
]`;

  const response = await generateText(prompt);
  
  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsedRecipes = JSON.parse(jsonMatch[0]) as Array<Omit<RecipeSuggestion, 'id'>>;
      // Double-check: filter out any disliked recipes that slipped through
      const filteredRecipes = parsedRecipes.filter(
        r => !dislikedRecipes.some(d => r.name.toLowerCase().includes(d.toLowerCase()))
      );
      return filteredRecipes.map((r, i) => ({
        ...r,
        id: `mealdb-${Date.now()}-${i}`,
      }));
    }
  } catch (e) {
    console.error('Failed to parse recipes JSON:', e);
  }
  
  return [];
}


// Filter scanned items to only return food/pantry items
export async function filterScannedItems(scannedItems: string[]): Promise<string[]> {
  if (scannedItems.length === 0) {
    return [];
  }

  const prompt = `You are analyzing text scanned from a receipt or grocery list. 
From the following list, identify ONLY the items that are food or pantry items (groceries, ingredients, beverages, snacks, etc.).

Remove any items that are:
- Store names, addresses, or phone numbers
- Prices, totals, taxes, or payment info
- Dates, times, or transaction IDs
- Non-food products (cleaning supplies, toiletries, etc.)
- Gibberish or OCR errors
- Duplicate entries

For food items, clean up the names:
- Remove quantity prefixes (e.g., "2x" or "3 ")
- Remove price suffixes
- Capitalize properly
- Use common names (e.g., "Milk" not "MLK 2%GAL")

Scanned items:
${scannedItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Return ONLY a valid JSON array of cleaned food item names, no other text:
["Item 1", "Item 2", "Item 3"]

If no food items are found, return an empty array: []`;

  const response = await generateText(prompt);
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]) as string[];
      return items.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
  } catch (e) {
    console.error('Failed to parse filtered items JSON:', e);
  }
  
  return [];
}

// Check if Mistral is available
export function isMistralAvailable(): boolean {
  return client !== null;
}

