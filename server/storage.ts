import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type {
  User,
  InsertUser,
  DailyExpense,
  InsertDailyExpense,
  Goal,
  InsertGoal,
  EMI,
  InsertEMI,
  Plan,
  InsertPlan,
  Finance,
  FinanceEntry,
  EMIScheduleItem,
  ExpenseItem,
} from "@shared/schema";
import { addMonths, format, parse } from "date-fns";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Daily Expense methods
  getExpenses(userId: string): Promise<DailyExpense[]>;
  getExpense(id: string): Promise<DailyExpense | undefined>;
  createExpense(userId: string, data: InsertDailyExpense): Promise<DailyExpense>;
  updateExpense(id: string, data: InsertDailyExpense): Promise<DailyExpense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Goal methods
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(userId: string, data: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  // EMI methods
  getEmis(userId: string): Promise<EMI[]>;
  getEmi(id: string): Promise<EMI | undefined>;
  createEmi(userId: string, data: InsertEMI): Promise<EMI>;
  updateEmiSchedule(id: string, monthIndex: number, status: "paid" | "unpaid"): Promise<EMI | undefined>;
  deleteEmi(id: string): Promise<boolean>;

  // Plan methods
  getPlans(userId: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(userId: string, data: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Finance methods
  getFinance(userId: string): Promise<Finance>;
  addFinanceEntry(userId: string, type: "debit" | "credit", entry: FinanceEntry): Promise<Finance>;
  removeFinanceEntry(userId: string, type: "debit" | "credit", index: number): Promise<Finance>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private expenses: Map<string, DailyExpense>;
  private goals: Map<string, Goal>;
  private emis: Map<string, EMI>;
  private plans: Map<string, Plan>;
  private finances: Map<string, Finance>;

  constructor() {
    this.users = new Map();
    this.expenses = new Map();
    this.goals = new Map();
    this.emis = new Map();
    this.plans = new Map();
    this.finances = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.phone === phone);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user: User = {
      id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    
    // Initialize finance for user
    this.finances.set(id, {
      id: randomUUID(),
      userId: id,
      debitList: [],
      creditList: [],
      totalDebit: 0,
      totalCredit: 0,
    });
    
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Daily Expense methods
  async getExpenses(userId: string): Promise<DailyExpense[]> {
    return Array.from(this.expenses.values())
      .filter((exp) => exp.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getExpense(id: string): Promise<DailyExpense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(userId: string, data: InsertDailyExpense): Promise<DailyExpense> {
    const id = randomUUID();
    const total = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expense: DailyExpense = {
      id,
      userId,
      date: data.date,
      expenses: data.expenses,
      total,
      salaryCredited: data.salaryCredited || 0,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, data: InsertDailyExpense): Promise<DailyExpense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const total = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const updatedExpense: DailyExpense = {
      ...expense,
      date: data.date,
      expenses: data.expenses,
      total,
      salaryCredited: data.salaryCredited || expense.salaryCredited,
    };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Goal methods
  async getGoals(userId: string): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter((goal) => goal.userId === userId);
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async createGoal(userId: string, data: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    const goal: Goal = {
      id,
      userId,
      goalName: data.goalName,
      status: "pending",
    };
    this.goals.set(id, goal);
    return goal;
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...data };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.goals.delete(id);
  }

  // EMI methods
  async getEmis(userId: string): Promise<EMI[]> {
    return Array.from(this.emis.values()).filter((emi) => emi.userId === userId);
  }

  async getEmi(id: string): Promise<EMI | undefined> {
    return this.emis.get(id);
  }

  async createEmi(userId: string, data: InsertEMI): Promise<EMI> {
    const id = randomUUID();
    const startDate = parse(data.startMonth, "yyyy-MM", new Date());
    const totalAmount = data.emiAmountPerMonth * data.emiDuration;
    
    // Generate EMI schedule
    const emiSchedule: EMIScheduleItem[] = [];
    for (let i = 0; i < data.emiDuration; i++) {
      const month = addMonths(startDate, i);
      emiSchedule.push({
        month: format(month, "yyyy-MM"),
        amount: data.emiAmountPerMonth,
        status: "unpaid",
      });
    }
    
    const emi: EMI = {
      id,
      userId,
      emiTitle: data.emiTitle,
      startMonth: data.startMonth,
      emiAmountPerMonth: data.emiAmountPerMonth,
      emiDuration: data.emiDuration,
      emiSchedule,
      remainingAmount: totalAmount,
      totalAmount,
    };
    this.emis.set(id, emi);
    return emi;
  }

  async updateEmiSchedule(id: string, monthIndex: number, status: "paid" | "unpaid"): Promise<EMI | undefined> {
    const emi = this.emis.get(id);
    if (!emi || monthIndex < 0 || monthIndex >= emi.emiSchedule.length) return undefined;
    
    emi.emiSchedule[monthIndex].status = status;
    
    // Recalculate remaining amount
    const paidAmount = emi.emiSchedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0);
    emi.remainingAmount = emi.totalAmount - paidAmount;
    
    this.emis.set(id, emi);
    return emi;
  }

  async deleteEmi(id: string): Promise<boolean> {
    return this.emis.delete(id);
  }

  // Plan methods
  async getPlans(userId: string): Promise<Plan[]> {
    return Array.from(this.plans.values()).filter((plan) => plan.userId === userId);
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async createPlan(userId: string, data: InsertPlan): Promise<Plan> {
    const id = randomUUID();
    const plan: Plan = {
      id,
      userId,
      planDescription: data.planDescription,
      status: "not_worked",
    };
    this.plans.set(id, plan);
    return plan;
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined> {
    const plan = this.plans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...data };
    this.plans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<boolean> {
    return this.plans.delete(id);
  }

  // Finance methods
  async getFinance(userId: string): Promise<Finance> {
    let finance = this.finances.get(userId);
    if (!finance) {
      finance = {
        id: randomUUID(),
        userId,
        debitList: [],
        creditList: [],
        totalDebit: 0,
        totalCredit: 0,
      };
      this.finances.set(userId, finance);
    }
    return finance;
  }

  async addFinanceEntry(userId: string, type: "debit" | "credit", entry: FinanceEntry): Promise<Finance> {
    const finance = await this.getFinance(userId);
    
    if (type === "debit") {
      finance.debitList.push(entry);
      finance.totalDebit = finance.debitList.reduce((sum, e) => sum + e.amount, 0);
    } else {
      finance.creditList.push(entry);
      finance.totalCredit = finance.creditList.reduce((sum, e) => sum + e.amount, 0);
    }
    
    this.finances.set(userId, finance);
    return finance;
  }

  async removeFinanceEntry(userId: string, type: "debit" | "credit", index: number): Promise<Finance> {
    const finance = await this.getFinance(userId);
    
    if (type === "debit" && index >= 0 && index < finance.debitList.length) {
      finance.debitList.splice(index, 1);
      finance.totalDebit = finance.debitList.reduce((sum, e) => sum + e.amount, 0);
    } else if (type === "credit" && index >= 0 && index < finance.creditList.length) {
      finance.creditList.splice(index, 1);
      finance.totalCredit = finance.creditList.reduce((sum, e) => sum + e.amount, 0);
    }
    
    this.finances.set(userId, finance);
    return finance;
  }
}

export const storage = new MemStorage();
