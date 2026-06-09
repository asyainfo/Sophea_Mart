// 1. Define strict types for category to prevent typos
export type ProductCategory =
  | "Drinks"
  | "Ingredients"
  | "Snacks"
  | "Baby Needs";

// 2. Define the Product interface
export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  sizes: string[];
  variants: string[];
  image: string; // This now expects a URL/path string
  description: string;
}

// 3. Apply the type to your data array
export const PRODUCTS_DATA: Product[] = [
  {
    id: 1,
    name: "Angkor Beer",
    category: "Drinks",
    price: 1.25,
    stock: 48,
    sizes: ["330ml", "500ml"],
    variants: ["Gold"],
    image: "/images/T001.png",
    description: "Premium Cambodian lager, crisp and refreshing.",
  },
  {
    id: 2,
    name: "Fresh Coconut Water",
    category: "Drinks",
    price: 0.75,
    stock: 30,
    sizes: ["350ml"],
    variants: ["Natural"],
    image: "/images/T002.png",
    description: "100% natural young coconut water, chilled.",
  },
  {
    id: 3,
    name: "Sting Energy Drink",
    category: "Drinks",
    price: 0.6,
    stock: 60,
    sizes: ["250ml"],
    variants: ["Red", "Blue"],
    image: "/images/T003.jpg",
    description: "High-energy carbonated drink with B-vitamins.",
  },
  {
    id: 4,
    name: "Jasmine Green Tea",
    category: "Drinks",
    price: 0.5,
    stock: 80,
    sizes: ["500ml", "1L"],
    variants: ["Green"],
    image: "/images/T003.jpg",
    description: "Aromatic jasmine-infused green tea, lightly sweetened.",
  },
  {
    id: 5,
    name: "Tiger Beer",
    category: "Drinks",
    price: 1.5,
    stock: 36,
    sizes: ["330ml", "640ml"],
    variants: ["Gold"],
    image: "/images/T002.png",
    description: "Asian premium lager with a clean, bold taste.",
  },
  {
    id: 6,
    name: "Jasmine Rice 5kg",
    category: "Ingredients",
    price: 4.5,
    stock: 25,
    sizes: ["5kg"],
    variants: ["White"],
    image: "/images/T002.png",
    description: "Premium Cambodian jasmine rice, fragrant and fluffy.",
  },
  {
    id: 7,
    name: "Fish Sauce Tiparos",
    category: "Ingredients",
    price: 1.75,
    stock: 40,
    sizes: ["300ml", "700ml"],
    variants: ["Amber"],
    image: "/images/T003.jpg",
    description: "Authentic Southeast Asian fish sauce for seasoning.",
  },
  {
    id: 8,
    name: "Coconut Milk",
    category: "Ingredients",
    price: 0.9,
    stock: 55,
    sizes: ["400ml"],
    variants: ["White"],
    image: "/images/T003.jpg",
    description: "Rich, creamy coconut milk for curries and desserts.",
  },
  {
    id: 9,
    name: "Kampot Pepper",
    category: "Ingredients",
    price: 3.5,
    stock: 20,
    sizes: ["50g", "100g"],
    variants: ["Black", "White", "Red"],
    image: "/images/T001.png",
    description: "World-famous Kampot pepper, bold aromatic flavour.",
  },
  {
    id: 10,
    name: "Palm Sugar",
    category: "Ingredients",
    price: 1.2,
    stock: 35,
    sizes: ["250g", "500g"],
    variants: ["Brown"],
    image: "/images/T001.png",
    description: "Traditional Cambodian palm sugar, naturally sweet.",
  },
  {
    id: 11,
    name: "Lay's Potato Chips",
    category: "Snacks",
    price: 0.85,
    stock: 70,
    sizes: ["Small", "Large"],
    variants: ["Original", "BBQ", "Cheese"],
    image: "/images/lays.png", // Changed from "🥔"
    description: "Crispy thin-cut potato chips in assorted flavors.",
  },
  {
    id: 12,
    name: "Oreo Cookies",
    category: "Snacks",
    price: 1.1,
    stock: 50,
    sizes: ["Regular", "Family"],
    variants: ["Original", "Double Stuff"],
    image: "/images/oreos.png", // Changed from "🍪"
    description: "Classic sandwich cookies with cream filling.",
  },
  {
    id: 13,
    name: "Shrimp Crackers",
    category: "Snacks",
    price: 0.65,
    stock: 45,
    sizes: ["80g", "150g"],
    variants: ["Original", "Spicy"],
    image: "/images/shrimp-crackers.png", // Changed from "🦐"
    description: "Light, airy shrimp-flavored prawn crackers.",
  },
  {
    id: 14,
    name: "Mochi Ice Cream",
    category: "Snacks",
    price: 2.25,
    stock: 28,
    sizes: ["6pcs", "12pcs"],
    variants: ["Strawberry", "Mango", "Green Tea"],
    image: "/images/mochi.png", // Changed from "🍡"
    description: "Soft rice cake wrapped around premium ice cream.",
  },
  {
    id: 15,
    name: "Dried Mango",
    category: "Snacks",
    price: 1.8,
    stock: 38,
    sizes: ["100g", "250g"],
    variants: ["Natural", "Spicy"],
    image: "/images/dried-mango.png", // Changed from "🥭"
    description: "Sweet-sour dried Cambodian mango slices.",
  },
  {
    id: 16,
    name: "Pampers Diapers S",
    category: "Baby Needs",
    price: 6.5,
    stock: 22,
    sizes: ["S (3-6kg)", "M (6-10kg)", "L (9-14kg)"],
    variants: ["White"],
    image: "/images/pampers.png", // Changed from "👶"
    description: "Ultra-soft diapers with 12-hour leak protection.",
  },
  {
    id: 17,
    name: "Johnson's Baby Lotion",
    category: "Baby Needs",
    price: 3.25,
    stock: 30,
    sizes: ["200ml", "500ml"],
    variants: ["Classic", "Aloe Vera"],
    image: "/images/baby-lotion.png", // Changed from "🧴"
    description: "Gentle, hypoallergenic moisturising baby lotion.",
  },
  {
    id: 18,
    name: "Cerelac Baby Cereal",
    category: "Baby Needs",
    price: 4.75,
    stock: 18,
    sizes: ["200g", "400g"],
    variants: ["Wheat", "Rice", "Honey"],
    image: "/images/cerelac.png", // Changed from "🍼"
    description: "Fortified baby cereal enriched with 19 nutrients.",
  },
  {
    id: 19,
    name: "Baby Wipes Huggies",
    category: "Baby Needs",
    price: 2.5,
    stock: 40,
    sizes: ["80 sheets", "160 sheets"],
    variants: ["Unscented", "Aloe"],
    image: "/images/baby-wipes.png", // Changed from "🧻"
    description: "Soft, thick baby wipes with gentle cleansing formula.",
  },
  {
    id: 20,
    name: "NAN Infant Formula",
    category: "Baby Needs",
    price: 12.0,
    stock: 12,
    sizes: ["400g", "800g"],
    variants: ["Stage 1", "Stage 2", "Stage 3"],
    image: "/images/nan-formula.png", // Changed from "🍼"
    description: "Premium infant formula for healthy brain development.",
  },
];
