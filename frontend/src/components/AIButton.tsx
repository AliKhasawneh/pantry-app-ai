import { useState } from 'react';
import { Sparkles, X, ChefHat, Loader2, Search, Bookmark } from 'lucide-react';
import { aiApi, recipesApi } from '../api';
import type { RecipeSuggestion } from '../api';
import { RecipeCard, getSavedRecipes } from './RecipeCard';

interface AIButtonProps {
  pantryItems: string[];
}

type ModalView = 'suggestions' | 'saved' | null;

export function AIButton({ pantryItems }: AIButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalView, setModalView] = useState<ModalView>(null);


  const handleSearchMealDB = async () => {
    if (pantryItems.length === 0) {
      setError('Add some items to your pantry first!');
      setModalView('suggestions');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipes([]);
    setModalView('suggestions');

    // Fallback to AI-generated suggestions
    const fallbackToAI = async () => {
      setLoadingMessage('Falling back to AI suggestions...');
      const response = await aiApi.suggestRecipes(pantryItems);
      if (response.recipes.length === 0) {
        setError('Could not generate recipes. Please try again.');
      } else {
        setRecipes(response.recipes);
      }
    };

    try {
      // Step 1: Use AI to find the best main ingredient
      setLoadingMessage('Finding main ingredient...');
      const filterResponse = await aiApi.filterIngredients(pantryItems);
      const mainIngredient = filterResponse.result.trim();

      // Step 2: Search MealDB with that ingredient
      setLoadingMessage(`Searching recipes with ${mainIngredient}...`);
      const recipesResponse = await recipesApi.searchByIngredient(mainIngredient);
      
      // Fallback if no recipes found in MealDB
      if (recipesResponse.meals.length === 0) {
        await fallbackToAI();
        return;
      }

      // Step 3: Send recipe names to AI for suggestions
      setLoadingMessage('AI is choosing recipes...');
      const recipeNames = recipesResponse.meals.map(m => m.name);
      const aiResponse = await aiApi.suggestFromRecipes(recipeNames, pantryItems);
      
      // Fallback if AI couldn't find matching recipes
      if (aiResponse.recipes.length === 0) {
        await fallbackToAI();
        return;
      }

      setRecipes(aiResponse.recipes);
    } catch (err) {
      // On any error, try falling back to AI suggestions
      try {
        await fallbackToAI();
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to get suggestions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSaved = () => {
    const saved = getSavedRecipes();
    setSavedRecipes(saved);
    setModalView('saved');
    setError(null);
    setRecipes([]);
  };

  const handleRemoveSaved = (index: number) => {
    setSavedRecipes(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setIsExpanded(false);
    setRecipes([]);
    setSavedRecipes([]);
    setError(null);
    setModalView(null);
  };

  const hasModal = modalView !== null;

  return (
    <>
      {/* Floating AI Button */}
      <div className="ai-fab-container">
        {isExpanded && (
          <div className="ai-menu">
            <button
              className="ai-menu-item"
              onClick={handleSearchMealDB}
              disabled={isLoading}
            >
              <Search size={18} />
              <span>Find Recipes</span>
            </button>
            <button
              className="ai-menu-item ai-menu-item--saved"
              onClick={handleShowSaved}
              disabled={isLoading}
            >
              <Bookmark size={18} />
              <span>Saved Recipes</span>
            </button>
          </div>
        )}

        <button
          className={`ai-fab ${isExpanded ? 'ai-fab--active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="AI Assistant"
        >
          {isExpanded ? <X size={24} /> : <ChefHat size={24} />}
        </button>
      </div>

      {/* Results Modal */}
      {hasModal && (
        <div className="modal-backdrop" onClick={handleClose}>
          <div className="modal ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalView === 'saved' ? (
                  <>
                    <Bookmark size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Saved Recipes
                  </>
                ) : (
                  <>
                    <Sparkles size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Recipe Suggestions
                  </>
                )}
              </h2>
              <button className="modal-close" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>

            <div className="ai-modal-content">
              {isLoading && (
                <div className="ai-loading">
                  <Loader2 size={32} className="ai-spinner" />
                  <p>{loadingMessage}</p>
                </div>
              )}

              {error && (
                <div className="ai-error">
                  <p>{error}</p>
                </div>
              )}

              {/* Recipe Suggestions View */}
              {modalView === 'suggestions' && recipes.length > 0 && (
                <div className="recipes-list">
                  {recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}

              {/* Saved Recipes View */}
              {modalView === 'saved' && (
                <>
                  {savedRecipes.length === 0 ? (
                    <div className="saved-recipes-empty">
                      <Bookmark size={48} strokeWidth={1} />
                      <p>No saved recipes yet</p>
                      <span>Like a recipe to save it here!</span>
                    </div>
                  ) : (
                    <div className="recipes-list">
                      {savedRecipes.map((recipe, index) => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          showRemove
                          onRemove={() => handleRemoveSaved(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
