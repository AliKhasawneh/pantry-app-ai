import { useState, useEffect } from 'react';
import { Heart, ChevronDown, ChevronUp, Trash2, ThumbsDown } from 'lucide-react';
import type { RecipeSuggestion } from '../api';
import { dislikedRecipesApi } from '../api';

interface RecipeCardProps {
  recipe: RecipeSuggestion;
  onRemove?: () => void;
  showRemove?: boolean;
}

// Local storage key for saved recipes
const SAVED_RECIPES_KEY = 'pantry-saved-recipes';

// Get saved recipes from localStorage
export function getSavedRecipes(): RecipeSuggestion[] {
  try {
    const stored = localStorage.getItem(SAVED_RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save recipes to localStorage
function saveRecipesToStorage(recipes: RecipeSuggestion[]): void {
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
}

// Check if a recipe is saved
export function isRecipeSaved(recipeName: string): boolean {
  const saved = getSavedRecipes();
  return saved.some(r => r.name.toLowerCase() === recipeName.toLowerCase());
}

// Add a recipe to saved
export function saveRecipe(recipe: RecipeSuggestion): void {
  const saved = getSavedRecipes();
  if (!isRecipeSaved(recipe.name)) {
    saved.push({
      ...recipe,
      id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    saveRecipesToStorage(saved);
  }
}

// Remove a recipe from saved
export function unsaveRecipe(recipeName: string): void {
  const saved = getSavedRecipes();
  const filtered = saved.filter(r => r.name.toLowerCase() !== recipeName.toLowerCase());
  saveRecipesToStorage(filtered);
}

export function RecipeCard({ recipe, onRemove, showRemove = false }: RecipeCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if recipe is liked/disliked on mount
  useEffect(() => {
    setIsLiked(isRecipeSaved(recipe.name));
    
    // Check if disliked from API
    dislikedRecipesApi.check(recipe.name)
      .then(result => setIsDisliked(result.isDisliked))
      .catch(() => setIsDisliked(false));
  }, [recipe.name]);

  const handleLike = () => {
    if (isLiked) {
      unsaveRecipe(recipe.name);
    } else {
      saveRecipe(recipe);
      // If was disliked, remove from disliked
      if (isDisliked) {
        dislikedRecipesApi.remove(recipe.name)
          .then(() => setIsDisliked(false))
          .catch(console.error);
      }
    }
    setIsLiked(!isLiked);
  };

  const handleDislike = async () => {
    try {
      if (isDisliked) {
        await dislikedRecipesApi.remove(recipe.name);
        setIsDisliked(false);
      } else {
        await dislikedRecipesApi.add(recipe.name);
        setIsDisliked(true);
        // If was liked, remove from saved
        if (isLiked) {
          unsaveRecipe(recipe.name);
          setIsLiked(false);
        }
      }
    } catch (error) {
      console.error('Failed to update dislike status:', error);
    }
  };

  const handleRemove = () => {
    unsaveRecipe(recipe.name);
    onRemove?.();
  };

  return (
    <div className={`recipe-card ${isDisliked ? 'recipe-card--disliked' : ''}`}>
      <div className="recipe-card-header">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <div className="recipe-card-actions">
          {showRemove ? (
            <button
              className="recipe-remove-btn"
              onClick={handleRemove}
              aria-label="Remove from saved"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <>
              <button
                className={`recipe-like-btn ${isLiked ? 'recipe-like-btn--liked' : ''}`}
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike recipe' : 'Like recipe'}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
              <button
                className={`recipe-dislike-btn ${isDisliked ? 'recipe-dislike-btn--disliked' : ''}`}
                onClick={handleDislike}
                aria-label={isDisliked ? 'Remove dislike' : 'Dislike recipe'}
              >
                <ThumbsDown size={18} fill={isDisliked ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="recipe-card-ingredients">
        <strong>Ingredients:</strong>
        <ul>
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </div>

      {recipe.optional && recipe.optional.length > 0 && (
        <div className="recipe-card-optional">
          <em>Optional: {recipe.optional.join(', ')}</em>
        </div>
      )}

      <button
        className="recipe-card-expand"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <span>Hide instructions</span>
            <ChevronUp size={16} />
          </>
        ) : (
          <>
            <span>Show instructions</span>
            <ChevronDown size={16} />
          </>
        )}
      </button>

      {isExpanded && (
        <div className="recipe-card-instructions">
          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
