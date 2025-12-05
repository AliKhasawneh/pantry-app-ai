# Pantry App

A smart pantry management application that helps you track your food inventory and discover recipes using AI.

## Features

### Pantry Management
- **Multiple Storage Areas** - Organize items by location (Fridge, Freezer, Pantry, etc.)
- **Item Tracking** - Track quantities, expiry dates, and usage status
- **"In Use" Status** - Mark items as opened/in use to prioritize consumption
- **Expiry Alerts** - Visual indicators for expired or expiring items

### AI-Powered Features

#### 🤖 Smart Recipe Suggestions
The app integrates with **Mistral AI** to suggest recipes based on your pantry contents:
- **Find Recipes** - Searches TheMealDB database and uses AI to match recipes you can make with available ingredients
- **AI Recipe Generation** - Falls back to AI-generated recipes when no database matches are found
- **Like/Dislike System** - Save favorite recipes and dislike ones you don't want to see again

#### 📸 Receipt Scanning
Quickly add items to your pantry by scanning grocery receipts:
- **OCR Processing** - Uses Tesseract.js to extract text from receipt images
- **AI Filtering** - Mistral AI filters the scanned text to identify only food items
- **Bulk Add** - Add multiple items at once with individual storage area selection and expiry dates

### Saved Recipes
- Save liked recipes for quick access
- Disliked recipes are remembered and excluded from future suggestions

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (better-sqlite3)
- **AI**: Mistral AI API
- **OCR**: Tesseract.js
- **Recipe Data**: TheMealDB API
- **Containerization**: Docker + Docker Compose

