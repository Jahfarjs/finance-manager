import { z } from "zod";

// User Schema
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  createdAt: z.string(),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });
export const loginSchema = z.object({
  phone: z.string().min(10, "Phone is required"),
  password: z.string().min(1, "Password is required"),
});
export const updateUserSchema = userSchema.omit({ id: true, password: true, createdAt: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// Expense Item
export const expenseItemSchema = z.object({
  _id: z.string().optional(), // MongoDB _id for items
  purpose: z.string().min(1, "Purpose is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

// Day Schema (within a month)
export const expenseDaySchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  items: z.array(expenseItemSchema),
  dayTotal: z.number(), // auto-calculated
});

// Daily Expense Schema (MONTH-LEVEL)
export const dailyExpenseSchema = z.object({
  _id: z.string().optional(), // MongoDB _id
  id: z.string(), // UUID for API
  userId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"), // YYYY-MM format
  salaryCredited: z.number().default(0),
  days: z.array(expenseDaySchema),
  monthlyTotal: z.number(), // auto-calculated
  balance: z.number(), // auto-calculated (salaryCredited - monthlyTotal)
});

// Schema for creating/updating a month
export const insertDailyExpenseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  salaryCredited: z.number().min(0).optional(),
});

// Schema for adding a day to a month
export const insertExpenseDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  items: z.array(expenseItemSchema).min(1, "At least one item is required"),
});

// Schema for updating a day
export const updateExpenseDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  items: z.array(expenseItemSchema),
});

// Schema for updating salary
export const updateSalarySchema = z.object({
  salaryCredited: z.number().min(0),
});

export type DailyExpense = z.infer<typeof dailyExpenseSchema>;
export type InsertDailyExpense = z.infer<typeof insertDailyExpenseSchema>;
export type ExpenseItem = z.infer<typeof expenseItemSchema>;
export type ExpenseDay = z.infer<typeof expenseDaySchema>;
export type InsertExpenseDay = z.infer<typeof insertExpenseDaySchema>;
export type UpdateExpenseDay = z.infer<typeof updateExpenseDaySchema>;
export type UpdateSalary = z.infer<typeof updateSalarySchema>;

// Monthly Goal Schema
export const goalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalName: z.string().min(1, "Goal name is required"),
  status: z.enum(["pending", "completed"]),
});

export const insertGoalSchema = z.object({
  goalName: z.string().min(1, "Goal name is required"),
});

export type Goal = z.infer<typeof goalSchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

// EMI Schedule Item
export const emiScheduleItemSchema = z.object({
  month: z.string(),
  amount: z.number(),
  status: z.enum(["paid", "unpaid"]),
});

// EMI Schema
export const emiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  emiTitle: z.string().min(1, "EMI title is required"),
  startMonth: z.string(),
  emiAmountPerMonth: z.number().min(1, "Amount must be positive"),
  emiDuration: z.number().min(1, "Duration must be at least 1 month"),
  emiSchedule: z.array(emiScheduleItemSchema), // auto-generated
  remainingAmount: z.number(), // auto-calculated
  totalAmount: z.number(), // auto-calculated
});

export const insertEmiSchema = z.object({
  emiTitle: z.string().min(1, "EMI title is required"),
  startMonth: z.string(),
  emiAmountPerMonth: z.number().min(1, "Amount must be positive"),
  emiDuration: z.number().min(1, "Duration must be at least 1 month"),
});

export type EMI = z.infer<typeof emiSchema>;
export type InsertEMI = z.infer<typeof insertEmiSchema>;
export type EMIScheduleItem = z.infer<typeof emiScheduleItemSchema>;

// Plan Schema
export const planSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planDescription: z.string().min(1, "Description is required"),
  status: z.enum(["worked", "not_worked"]),
});

export const insertPlanSchema = z.object({
  planDescription: z.string().min(1, "Description is required"),
});

export type Plan = z.infer<typeof planSchema>;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

// Finance Entry (Debit/Credit)
export const financeEntrySchema = z.object({
  person: z.string().min(1, "Person name is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

// Finance Schema
export const financeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  debitList: z.array(financeEntrySchema),
  creditList: z.array(financeEntrySchema),
  totalDebit: z.number(), // auto-calculated
  totalCredit: z.number(), // auto-calculated
});

export const insertFinanceEntrySchema = z.object({
  type: z.enum(["debit", "credit"]),
  person: z.string().min(1, "Person name is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

export type Finance = z.infer<typeof financeSchema>;
export type FinanceEntry = z.infer<typeof financeEntrySchema>;
export type InsertFinanceEntry = z.infer<typeof insertFinanceEntrySchema>;

// API Response Types
export interface AuthResponse {
  token: string;
  user: Omit<User, "password">;
}

export interface DashboardStats {
  totalExpenses: number;
  balance: number;
  totalCredit: number;
  totalDebit: number;
  pendingGoals: number;
  activeEmis: number;
  salaryCredited: number;
}
