import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type {
  User,
  InsertUser,
  DailyExpense,
  InsertDailyExpense,
  InsertExpenseDay,
  UpdateExpenseDay,
  UpdateSalary,
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
import { UserModel } from "./models/User";
import { DailyExpenseModel } from "./models/DailyExpense";
import { GoalModel } from "./models/Goal";
import { EMIModel } from "./models/EMI";
import { PlanModel } from "./models/Plan";
import { FinanceModel } from "./models/Finance";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Daily Expense methods (month-based)
  getExpenseByMonth(userId: string, month: string): Promise<DailyExpense | undefined>;
  getAllExpenseMonths(userId: string): Promise<DailyExpense[]>;
  createExpenseMonth(userId: string, data: InsertDailyExpense): Promise<DailyExpense>;
  updateExpenseMonthSalary(userId: string, month: string, salaryCredited: number): Promise<DailyExpense | undefined>;
  addExpenseDay(userId: string, month: string, data: InsertExpenseDay): Promise<DailyExpense | undefined>;
  updateExpenseDay(userId: string, month: string, data: UpdateExpenseDay): Promise<DailyExpense | undefined>;
  deleteExpenseDay(userId: string, month: string, date: string): Promise<DailyExpense | undefined>;
  deleteExpenseDayItem(userId: string, month: string, date: string, itemId: string): Promise<DailyExpense | undefined>;

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

export class MongoStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ id }).lean();
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ phone }).lean();
    return user || undefined;
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
    
    await UserModel.create(user);
    
    // Initialize finance for user
    const financeId = randomUUID();
    await FinanceModel.create({
      id: financeId,
      userId: id,
      debitList: [],
      creditList: [],
      totalDebit: 0,
      totalCredit: 0,
    });
    
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return user || undefined;
  }

  // Helper function to recalculate totals for a month document
  private async recalculateMonthTotals(monthDoc: DailyExpense): Promise<DailyExpense> {
    // Calculate dayTotal for each day
    monthDoc.days.forEach((day) => {
      day.dayTotal = day.items.reduce((sum, item) => sum + item.amount, 0);
    });

    // Calculate monthlyTotal from all days
    monthDoc.monthlyTotal = monthDoc.days.reduce((sum, day) => sum + day.dayTotal, 0);

    // Calculate balance
    monthDoc.balance = monthDoc.salaryCredited - monthDoc.monthlyTotal;

    // Save and return
    const updated = await DailyExpenseModel.findOneAndUpdate(
      { id: monthDoc.id },
      {
        $set: {
          days: monthDoc.days,
          monthlyTotal: monthDoc.monthlyTotal,
          balance: monthDoc.balance,
        },
      },
      { new: true, lean: true }
    );
    return updated || monthDoc;
  }

  // Daily Expense methods (month-based)
  async getExpenseByMonth(userId: string, month: string): Promise<DailyExpense | undefined> {
    const expense = await DailyExpenseModel.findOne({ userId, month }).lean();
    return expense || undefined;
  }

  async getAllExpenseMonths(userId: string): Promise<DailyExpense[]> {
    const expenses = await DailyExpenseModel.find({ userId })
      .sort({ month: -1 })
      .lean();
    return expenses;
  }

  async createExpenseMonth(userId: string, data: InsertDailyExpense): Promise<DailyExpense> {
    // Check if month already exists
    const existing = await DailyExpenseModel.findOne({ userId, month: data.month }).lean();
    if (existing) {
      throw new Error("Month already exists");
    }

    const id = randomUUID();
    const expense: DailyExpense = {
      id,
      userId,
      month: data.month,
      salaryCredited: data.salaryCredited || 0,
      days: [],
      monthlyTotal: 0,
      balance: data.salaryCredited || 0,
    };
    
    const created = await DailyExpenseModel.create(expense);
    return created.toObject();
  }

  async updateExpenseMonthSalary(userId: string, month: string, salaryCredited: number): Promise<DailyExpense | undefined> {
    const monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) return undefined;

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      {
        $set: { salaryCredited },
      },
      { new: true, lean: true }
    );

    if (!updated) return undefined;

    // Recalculate balance
    return await this.recalculateMonthTotals(updated);
  }

  async addExpenseDay(userId: string, month: string, data: InsertExpenseDay): Promise<DailyExpense | undefined> {
    let monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) {
      // Create month if it doesn't exist
      await this.createExpenseMonth(userId, { month, salaryCredited: 0 });
      // Fetch the newly created month
      monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
      if (!monthDoc) return undefined;
    }

    // Check if day already exists
    const dayIndex = monthDoc.days.findIndex((d) => d.date === data.date);
    
    let updatedDays = [...monthDoc.days];
    if (dayIndex >= 0) {
      // Append items to existing day
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        items: [...updatedDays[dayIndex].items, ...data.items],
      };
    } else {
      // Create new day
      const dayTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
      updatedDays.push({
        date: data.date,
        items: data.items,
        dayTotal,
      });
    }

    // Update the month document
    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      { $set: { days: updatedDays } },
      { new: true, lean: true }
    );

    if (!updated) return undefined;

    // Recalculate totals
    return await this.recalculateMonthTotals(updated);
  }

  async updateExpenseDay(userId: string, month: string, data: UpdateExpenseDay): Promise<DailyExpense | undefined> {
    const monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) return undefined;

    const dayIndex = monthDoc.days.findIndex((d) => d.date === data.date);
    if (dayIndex < 0) return undefined;

    const updatedDays = [...monthDoc.days];
    const dayTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    updatedDays[dayIndex] = {
      date: data.date,
      items: data.items,
      dayTotal,
    };

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      { $set: { days: updatedDays } },
      { new: true, lean: true }
    );

    if (!updated) return undefined;

    // Recalculate totals
    return await this.recalculateMonthTotals(updated);
  }

  async deleteExpenseDay(userId: string, month: string, date: string): Promise<DailyExpense | undefined> {
    const monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) return undefined;

    const updatedDays = monthDoc.days.filter((d) => d.date !== date);

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      { $set: { days: updatedDays } },
      { new: true, lean: true }
    );

    if (!updated) return undefined;

    // Recalculate totals
    return await this.recalculateMonthTotals(updated);
  }

  async deleteExpenseDayItem(userId: string, month: string, date: string, itemId: string): Promise<DailyExpense | undefined> {
    const monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) return undefined;

    const dayIndex = monthDoc.days.findIndex((d) => d.date === date);
    if (dayIndex < 0) return undefined;

    const updatedDays = [...monthDoc.days];
    // Filter out the item with matching _id (handle both ObjectId and string)
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      items: updatedDays[dayIndex].items.filter((item, idx) => {
        const itemMongoId = (item as any)._id;
        if (itemMongoId) {
          // Compare MongoDB ObjectId
          return itemMongoId.toString() !== itemId;
        }
        // Fallback to index-based deletion if no _id
        return idx.toString() !== itemId;
      }),
    };

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      { $set: { days: updatedDays } },
      { new: true, lean: true }
    );

    if (!updated) return undefined;

    // Recalculate totals
    return await this.recalculateMonthTotals(updated);
  }

  // Goal methods
  async getGoals(userId: string): Promise<Goal[]> {
    const goals = await GoalModel.find({ userId }).lean();
    return goals;
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const goal = await GoalModel.findOne({ id }).lean();
    return goal || undefined;
  }

  async createGoal(userId: string, data: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    const goal: Goal = {
      id,
      userId,
      goalName: data.goalName,
      status: "pending",
    };
    await GoalModel.create(goal);
    return goal;
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined> {
    const goal = await GoalModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return goal || undefined;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await GoalModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // EMI methods
  async getEmis(userId: string): Promise<EMI[]> {
    const emis = await EMIModel.find({ userId }).lean();
    return emis;
  }

  async getEmi(id: string): Promise<EMI | undefined> {
    const emi = await EMIModel.findOne({ id }).lean();
    return emi || undefined;
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
    await EMIModel.create(emi);
    return emi;
  }

  async updateEmiSchedule(id: string, monthIndex: number, status: "paid" | "unpaid"): Promise<EMI | undefined> {
    const emi = await EMIModel.findOne({ id }).lean();
    if (!emi || monthIndex < 0 || monthIndex >= emi.emiSchedule.length) return undefined;
    
    // Update the specific schedule item
    const updatePath = `emiSchedule.${monthIndex}.status`;
    await EMIModel.updateOne(
      { id },
      { $set: { [updatePath]: status } }
    );
    
    // Recalculate remaining amount
    const updatedEmi = await EMIModel.findOne({ id }).lean();
    if (!updatedEmi) return undefined;
    
    const paidAmount = updatedEmi.emiSchedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0);
    
    const finalEmi = await EMIModel.findOneAndUpdate(
      { id },
      { $set: { remainingAmount: updatedEmi.totalAmount - paidAmount } },
      { new: true, lean: true }
    );
    
    return finalEmi || undefined;
  }

  async deleteEmi(id: string): Promise<boolean> {
    const result = await EMIModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Plan methods
  async getPlans(userId: string): Promise<Plan[]> {
    const plans = await PlanModel.find({ userId }).lean();
    return plans;
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const plan = await PlanModel.findOne({ id }).lean();
    return plan || undefined;
  }

  async createPlan(userId: string, data: InsertPlan): Promise<Plan> {
    const id = randomUUID();
    const plan: Plan = {
      id,
      userId,
      planDescription: data.planDescription,
      status: "not_worked",
    };
    await PlanModel.create(plan);
    return plan;
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined> {
    const plan = await PlanModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return plan || undefined;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await PlanModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Finance methods
  async getFinance(userId: string): Promise<Finance> {
    let finance = await FinanceModel.findOne({ userId }).lean<Finance>();
    if (!finance) {
      const id = randomUUID();
      const newFinance: Finance = {
        id,
        userId,
        debitList: [],
        creditList: [],
        totalDebit: 0,
        totalCredit: 0,
      };
      await FinanceModel.create(newFinance);
      finance = newFinance;
    } else {
      // Remove _id and __v from lean() result to maintain API contract
      const { _id, __v, ...financeWithoutId } = finance as any;
      finance = financeWithoutId as Finance;
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
    
    const updatedFinance = await FinanceModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          debitList: finance.debitList,
          creditList: finance.creditList,
          totalDebit: finance.totalDebit,
          totalCredit: finance.totalCredit,
        },
      },
      { new: true, lean: true }
    );
    
    if (updatedFinance) {
      const { _id, __v, ...financeWithoutId } = updatedFinance as any;
      return financeWithoutId as Finance;
    }
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
    
    const updatedFinance = await FinanceModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          debitList: finance.debitList,
          creditList: finance.creditList,
          totalDebit: finance.totalDebit,
          totalCredit: finance.totalCredit,
        },
      },
      { new: true, lean: true }
    );
    
    if (updatedFinance) {
      const { _id, __v, ...financeWithoutId } = updatedFinance as any;
      return financeWithoutId as Finance;
    }
    return finance;
  }
}

// Keep MemStorage for backward compatibility if needed
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

// Use MongoStorage as the default storage
export const storage = new MongoStorage();
