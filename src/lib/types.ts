export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
};

export type Meal = {
  name: string;
  foods: string[];
  macros: Macros;
};

export type DayEntry = {
  id: string;
  date: string; // YYYY-MM-DD or human label
  title: string;
  category:
    | "balanced"
    | "over-budget"
    | "low-protein"
    | "clean"
    | "junk-heavy"
    | "other";
  meals: Meal[];
  totals: Macros;
  targets: Macros;
  hazards: string[];
  advice: string;
  tags: string[];
  rawInput: string;
  createdAt: number;
};
