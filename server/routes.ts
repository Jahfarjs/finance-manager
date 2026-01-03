import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertDailyExpenseSchema,
  insertExpenseDaySchema,
  updateExpenseDaySchema,
  updateSalarySchema,
  insertGoalSchema,
  insertEmiSchema,
  insertPlanSchema,
  insertFinanceEntrySchema,
  updateUserSchema,
} from "@shared/schema";

// Utility function to get JWT secret - only called at runtime inside route handlers
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string") {
    throw new Error("JWT_SECRET is missing or invalid");
  }
  return secret;
}

interface AuthRequest extends Request {
  userId?: string;
}

// Auth middleware
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const existingUser = await storage.getUserByPhone(result.data.phone);
      if (existingUser) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const user = await storage.createUser(result.data);
      const secret = getJWTSecret();
      const token = jwt.sign({ userId: user.id }, secret, { 
        expiresIn: "7d",
        algorithm: "HS256"
      });
      
      const { password, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const user = await storage.getUserByPhone(result.data.phone);
      if (!user) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }

      const isValidPassword = await bcrypt.compare(result.data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }

      const secret = getJWTSecret();
      const token = jwt.sign({ userId: user.id }, secret, { 
        expiresIn: "7d",
        algorithm: "HS256"
      });
      
      const { password, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // User routes
  app.put("/api/user/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = updateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const user = await storage.updateUser(req.userId!, result.data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      
      const expenseMonths = await storage.getAllExpenseMonths(userId);
      const goals = await storage.getGoals(userId);
      const emis = await storage.getEmis(userId);
      const finance = await storage.getFinance(userId);

      const totalExpenses = expenseMonths.reduce((sum, month) => sum + month.monthlyTotal, 0);
      const salaryCredited = expenseMonths.reduce((sum, month) => sum + month.salaryCredited, 0);
      const balance = salaryCredited - totalExpenses;
      const pendingGoals = goals.filter((g) => g.status === "pending").length;
      const activeEmis = emis.filter((e) => e.remainingAmount > 0).length;

      res.json({
        totalExpenses,
        balance,
        totalCredit: finance.totalCredit,
        totalDebit: finance.totalDebit,
        pendingGoals,
        activeEmis,
        salaryCredited,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Expense routes (month-based)
  // Get all expense months for a user
  app.get("/api/expenses/months", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const expenseMonths = await storage.getAllExpenseMonths(req.userId!);
      res.json(expenseMonths);
    } catch (error) {
      console.error("Get expense months error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get expense data for a specific month
  app.get("/api/expenses/month/:month", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }

      const expense = await storage.getExpenseByMonth(req.userId!, month);
      if (!expense) {
        return res.status(404).json({ message: "Month not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Get expense month error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new expense month
  app.post("/api/expenses/month", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = insertDailyExpenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const expense = await storage.createExpenseMonth(req.userId!, result.data);
      res.json(expense);
    } catch (error) {
      console.error("Create expense month error:", error);
      if (error instanceof Error && error.message === "Month already exists") {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update salary for a month (creates month if it doesn't exist)
  app.put("/api/expenses/month/:month/salary", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }

      const result = updateSalarySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      // Check if month exists
      let expense = await storage.getExpenseByMonth(req.userId!, month);
      
      if (!expense) {
        // Create the month with the salary if it doesn't exist
        expense = await storage.createExpenseMonth(req.userId!, {
          month,
          salaryCredited: result.data.salaryCredited,
        });
      } else {
        // Update existing month's salary
        const updated = await storage.updateExpenseMonthSalary(req.userId!, month, result.data.salaryCredited);
        if (!updated) {
          return res.status(500).json({ message: "Failed to update salary" });
        }
        expense = updated;
      }

      res.json(expense);
    } catch (error) {
      console.error("Update salary error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Add a day with items to a month
  app.post("/api/expenses/month/:month/day", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }

      const result = insertExpenseDaySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      // Validate that the date belongs to the month
      const dateMonth = result.data.date.substring(0, 7);
      if (dateMonth !== month) {
        return res.status(400).json({ message: "Date must belong to the specified month" });
      }

      const updated = await storage.addExpenseDay(req.userId!, month, result.data);
      if (!updated) {
        return res.status(500).json({ message: "Failed to add expense day" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Add expense day error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update a day in a month
  app.put("/api/expenses/month/:month/day/:date", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      const date = req.params.date;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const result = updateExpenseDaySchema.safeParse({ ...req.body, date });
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const expense = await storage.getExpenseByMonth(req.userId!, month);
      if (!expense) {
        return res.status(404).json({ message: "Month not found" });
      }

      const updated = await storage.updateExpenseDay(req.userId!, month, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Day not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update expense day error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a day from a month
  app.delete("/api/expenses/month/:month/day/:date", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      const date = req.params.date;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const expense = await storage.getExpenseByMonth(req.userId!, month);
      if (!expense) {
        return res.status(404).json({ message: "Month not found" });
      }

      const updated = await storage.deleteExpenseDay(req.userId!, month, date);
      if (!updated) {
        return res.status(404).json({ message: "Day not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Delete expense day error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a specific item from a day
  app.delete("/api/expenses/month/:month/day/:date/item/:itemId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const month = req.params.month;
      const date = req.params.date;
      const itemId = req.params.itemId;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const expense = await storage.getExpenseByMonth(req.userId!, month);
      if (!expense) {
        return res.status(404).json({ message: "Month not found" });
      }

      const updated = await storage.deleteExpenseDayItem(req.userId!, month, date, itemId);
      if (!updated) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Delete expense item error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Goal routes
  app.get("/api/goals", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const goals = await storage.getGoals(req.userId!);
      res.json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/goals", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = insertGoalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const goal = await storage.createGoal(req.userId!, result.data);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/goals/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const updated = await storage.updateGoal(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/goals/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal || goal.userId !== req.userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      await storage.deleteGoal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // EMI routes
  app.get("/api/emis", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const emis = await storage.getEmis(req.userId!);
      res.json(emis);
    } catch (error) {
      console.error("Get emis error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/emis", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = insertEmiSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const emi = await storage.createEmi(req.userId!, result.data);
      res.json(emi);
    } catch (error) {
      console.error("Create emi error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/emis/:id/schedule/:monthIndex", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const emi = await storage.getEmi(req.params.id);
      if (!emi || emi.userId !== req.userId) {
        return res.status(404).json({ message: "EMI not found" });
      }

      const monthIndex = parseInt(req.params.monthIndex);
      const status = req.body.status as "paid" | "unpaid";
      
      const updated = await storage.updateEmiSchedule(req.params.id, monthIndex, status);
      res.json(updated);
    } catch (error) {
      console.error("Update emi schedule error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/emis/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const emi = await storage.getEmi(req.params.id);
      if (!emi || emi.userId !== req.userId) {
        return res.status(404).json({ message: "EMI not found" });
      }

      await storage.deleteEmi(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete emi error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Plan routes
  app.get("/api/plans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const plans = await storage.getPlans(req.userId!);
      res.json(plans);
    } catch (error) {
      console.error("Get plans error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/plans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = insertPlanSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const plan = await storage.createPlan(req.userId!, result.data);
      res.json(plan);
    } catch (error) {
      console.error("Create plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/plans/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const updated = await storage.updatePlan(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/plans/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const updated = await storage.updatePlan(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/plans/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ message: "Plan not found" });
      }

      await storage.deletePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete plan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Finance routes
  app.get("/api/finance", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const finance = await storage.getFinance(req.userId!);
      res.json(finance);
    } catch (error) {
      console.error("Get finance error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/finance/entry", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = insertFinanceEntrySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { type, person, amount } = result.data;
      const finance = await storage.addFinanceEntry(req.userId!, type, { person, amount });
      res.json(finance);
    } catch (error) {
      console.error("Add finance entry error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/finance/entry/:type/:index", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const type = req.params.type as "debit" | "credit";
      const index = parseInt(req.params.index);
      
      if (type !== "debit" && type !== "credit") {
        return res.status(400).json({ message: "Invalid type" });
      }

      const finance = await storage.removeFinanceEntry(req.userId!, type, index);
      res.json(finance);
    } catch (error) {
      console.error("Remove finance entry error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}
