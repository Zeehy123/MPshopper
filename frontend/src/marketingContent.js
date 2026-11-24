import { ChartColumn, History, ListChecks } from "lucide-react";

export const FEATURES = [
  {
    Icon: ChartColumn,
    title: "Know what things cost",
    text: "Save product prices as you shop, and keep an eye on how they change over time.",
    tone: "gold",
  },
  {
    Icon: ListChecks,
    title: "Shop with a plan",
    text: "Build your grocery list, keep an eye on your budget, and make your next trip feel easier.",
    tone: "green",
  },
  {
    Icon: History,
    title: "Remember every trip",
    text: "Look back at past baskets and spending, so your next shopping decision is better informed.",
    tone: "coral",
  },
];

export const STEPS = [
  {
    number: "01",
    title: "Add the groceries you buy",
    text: "Create a personal product list with categories, quantities, prices, and optional photos.",
    detail: "Your regular essentials are easy to find the next time you shop.",
  },
  {
    number: "02",
    title: "Build your basket as you shop",
    text: "Add products to your cart, adjust quantities, and set a budget to keep your running total in view.",
    detail: "Compare prices by store and make changes as you go.",
  },
  {
    number: "03",
    title: "Finish your trip and look back",
    text: "Complete your basket to save it in your history and update the prices you paid.",
    detail: "Your past trips and spending summaries help you plan ahead.",
  },
];
