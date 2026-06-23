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
  PersonalMemory,
  InsertPersonalMemory,
  UpdatePersonalMemory,
  Wishlist,
  InsertWishlist,
  UpdateWishlist,
  DailyTask,
  InsertDailyTask,
  UpdateDailyTask,
  Reminder,
  InsertReminder,
  UpdateReminder,
} from "@shared/schema";
import { addMonths, format, parse } from "date-fns";
import { UserModel } from "./models/User";
import { DailyExpenseModel } from "./models/DailyExpense";
import { GoalModel } from "./models/Goal";
import { EMIModel } from "./models/EMI";
import { PlanModel } from "./models/Plan";
import { FinanceModel } from "./models/Finance";
import { PersonalMemoryModel } from "./models/PersonalMemory";
import { WishlistModel } from "./models/Wishlist";
import { DailyTaskModel } from "./models/DailyTask";
import { ReminderModel } from "./models/Reminder";

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
  updateExpenseMonthBalanceDistribution(userId: string, month: string, balanceSBI: number, balanceKGB: number, balanceCash: number): Promise<DailyExpense | undefined>;
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
  updateEmi(id: string, data: InsertEMI): Promise<EMI | undefined>;
  updateEmiSchedule(id: string, monthIndex: number, status: "paid" | "unpaid"): Promise<EMI | undefined>;
  updateKuriReceived(id: string, amount: number, date?: string): Promise<EMI | undefined>;
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
  updateFinanceEntry(userId: string, type: "debit" | "credit", index: number, entry: FinanceEntry): Promise<Finance>;
  removeFinanceEntry(userId: string, type: "debit" | "credit", index: number): Promise<Finance>;

  // Personal Memory methods
  getMemories(userId: string): Promise<PersonalMemory[]>;
  getMemoriesByDate(userId: string, date: string): Promise<PersonalMemory[]>;
  getMemory(id: string): Promise<PersonalMemory | undefined>;
  createMemory(userId: string, data: InsertPersonalMemory): Promise<PersonalMemory>;
  updateMemory(id: string, data: UpdatePersonalMemory): Promise<PersonalMemory | undefined>;
  deleteMemory(id: string): Promise<boolean>;

  // Wishlist methods
  getWishlist(userId: string): Promise<Wishlist[]>;
  getWishlistItem(id: string): Promise<Wishlist | undefined>;
  createWishlistItem(userId: string, data: InsertWishlist): Promise<Wishlist>;
  updateWishlistItem(id: string, data: UpdateWishlist): Promise<Wishlist | undefined>;
  deleteWishlistItem(id: string): Promise<boolean>;

  // Daily Task methods
  getDailyTasks(userId: string): Promise<DailyTask[]>;
  getDailyTask(id: string): Promise<DailyTask | undefined>;
  createDailyTask(userId: string, data: InsertDailyTask): Promise<DailyTask>;
  updateDailyTask(id: string, data: UpdateDailyTask): Promise<DailyTask | undefined>;
  toggleDailyTaskCompletion(id: string, date: string): Promise<DailyTask | undefined>;
  deleteDailyTask(id: string): Promise<boolean>;

  // Reminder methods
  getReminders(userId: string): Promise<Reminder[]>;
  getPendingReminders(userId: string, now: string): Promise<Reminder[]>;
  getDueRemindersForPush(now: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(userId: string, data: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, data: UpdateReminder): Promise<Reminder | undefined>;
  markReminderPushSent(id: string): Promise<void>;
  deleteReminder(id: string): Promise<boolean>;

  // Push subscription
  saveOneSignalPlayerId(userId: string, playerId: string): Promise<void>;
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
    monthDoc.days.forEach((day) => {
      day.dayTotal = day.items
        .filter((item) => item.type !== "earning")
        .reduce((sum, item) => sum + item.amount, 0);

      day.dayEarnings = day.items
        .filter((item) => item.type === "earning")
        .reduce((sum, item) => sum + item.amount, 0);
    });

    monthDoc.monthlyTotal = monthDoc.days.reduce((sum, day) => sum + day.dayTotal, 0);
    monthDoc.monthlyEarnings = monthDoc.days.reduce((sum, day) => sum + (day.dayEarnings ?? 0), 0);
    monthDoc.balance = monthDoc.salaryCredited + monthDoc.monthlyEarnings - monthDoc.monthlyTotal;

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { id: monthDoc.id },
      {
        $set: {
          days: monthDoc.days,
          monthlyTotal: monthDoc.monthlyTotal,
          monthlyEarnings: monthDoc.monthlyEarnings,
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
      monthlyEarnings: 0,
      balance: data.salaryCredited || 0,
      balanceSBI: 0,
      balanceKGB: 0,
      balanceCash: 0,
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

  async updateExpenseMonthBalanceDistribution(userId: string, month: string, balanceSBI: number, balanceKGB: number, balanceCash: number): Promise<DailyExpense | undefined> {
    const monthDoc = await DailyExpenseModel.findOne({ userId, month }).lean();
    if (!monthDoc) return undefined;

    // Validate that the sum equals the balance
    const total = balanceSBI + balanceKGB + balanceCash;
    if (Math.abs(total - monthDoc.balance) > 0.01) {
      throw new Error(`Balance distribution sum (${total}) must equal the current balance (${monthDoc.balance})`);
    }

    const updated = await DailyExpenseModel.findOneAndUpdate(
      { userId, month },
      {
        $set: { balanceSBI, balanceKGB, balanceCash },
      },
      { new: true, lean: true }
    );

    return updated || undefined;
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
      const dayTotal = data.items
        .filter((item) => item.type !== "earning")
        .reduce((sum, item) => sum + item.amount, 0);
      const dayEarnings = data.items
        .filter((item) => item.type === "earning")
        .reduce((sum, item) => sum + item.amount, 0);
      updatedDays.push({
        date: data.date,
        items: data.items,
        dayTotal,
        dayEarnings,
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
    const dayTotal = data.items
      .filter((item) => item.type !== "earning")
      .reduce((sum, item) => sum + item.amount, 0);
    const dayEarnings = data.items
      .filter((item) => item.type === "earning")
      .reduce((sum, item) => sum + item.amount, 0);
    updatedDays[dayIndex] = {
      date: data.date,
      items: data.items,
      dayTotal,
      dayEarnings,
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
    const totalAmount = data.emiAmountPerMonth * data.emiDuration;
    const frequency = data.paymentFrequency || "monthly";

    // Parse start date based on format
    let startDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.startMonth)) {
      startDate = parse(data.startMonth, "yyyy-MM-dd", new Date());
    } else {
      startDate = parse(data.startMonth, "yyyy-MM", new Date());
    }

    // Generate EMI schedule based on frequency
    const emiSchedule: EMIScheduleItem[] = [];
    for (let i = 0; i < data.emiDuration; i++) {
      let scheduleDate: Date;
      switch (frequency) {
        case "weekly":
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * 7);
          break;
        case "twice_monthly":
          // 1st and 15th pattern: even index = start, odd index = +15 days
          const monthOffset = Math.floor(i / 2);
          scheduleDate = addMonths(startDate, monthOffset);
          if (i % 2 === 1) {
            scheduleDate.setDate(15);
          } else {
            scheduleDate.setDate(1);
          }
          break;
        case "custom":
          const interval = data.customIntervalDays || 30;
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * interval);
          break;
        case "monthly":
        default:
          scheduleDate = addMonths(startDate, i);
          break;
      }
      emiSchedule.push({
        date: format(scheduleDate, "yyyy-MM-dd"),
        amount: data.emiAmountPerMonth,
        status: "unpaid",
      });
    }

    const emi: EMI = {
      id,
      userId,
      emiTitle: data.emiTitle,
      startMonth: data.startMonth,
      paymentFrequency: frequency,
      customIntervalDays: data.customIntervalDays,
      emiAmountPerMonth: data.emiAmountPerMonth,
      emiDuration: data.emiDuration,
      emiSchedule,
      remainingAmount: totalAmount,
      totalAmount,
      isKuri: data.isKuri || false,
      kuriReceivedAmount: 0,
    };
    await EMIModel.create(emi);
    return emi;
  }

  async updateEmi(id: string, data: InsertEMI): Promise<EMI | undefined> {
    const existingEmi = await EMIModel.findOne({ id }).lean();
    if (!existingEmi) return undefined;

    const totalAmount = data.emiAmountPerMonth * data.emiDuration;
    const frequency = data.paymentFrequency || "monthly";

    let startDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.startMonth)) {
      startDate = parse(data.startMonth, "yyyy-MM-dd", new Date());
    } else {
      startDate = parse(data.startMonth, "yyyy-MM", new Date());
    }

    const newSchedule: EMIScheduleItem[] = [];
    for (let i = 0; i < data.emiDuration; i++) {
      let scheduleDate: Date;
      switch (frequency) {
        case "weekly":
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * 7);
          break;
        case "twice_monthly": {
          const monthOffset = Math.floor(i / 2);
          scheduleDate = addMonths(startDate, monthOffset);
          scheduleDate.setDate(i % 2 === 0 ? 1 : 15);
          break;
        }
        case "custom": {
          const interval = data.customIntervalDays || 30;
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * interval);
          break;
        }
        default:
          scheduleDate = addMonths(startDate, i);
          break;
      }
      // Preserve paid status by index position
      const existingStatus = existingEmi.emiSchedule[i]?.status ?? "unpaid";
      newSchedule.push({
        date: format(scheduleDate, "yyyy-MM-dd"),
        amount: data.emiAmountPerMonth,
        status: existingStatus,
      });
    }

    const paidAmount = newSchedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0);

    const updated = await EMIModel.findOneAndUpdate(
      { id },
      {
        $set: {
          emiTitle: data.emiTitle,
          startMonth: data.startMonth,
          paymentFrequency: frequency,
          customIntervalDays: data.customIntervalDays,
          emiAmountPerMonth: data.emiAmountPerMonth,
          emiDuration: data.emiDuration,
          isKuri: data.isKuri,
          emiSchedule: newSchedule,
          totalAmount,
          remainingAmount: totalAmount - paidAmount,
        },
      },
      { new: true, lean: true }
    );
    return updated || undefined;
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

  async updateKuriReceived(id: string, amount: number, date?: string): Promise<EMI | undefined> {
    const updateData: any = { kuriReceivedAmount: amount };
    if (date) updateData.kuriReceivedDate = date;
    const emi = await EMIModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true }
    );
    return emi || undefined;
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
      date: data.date,
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

  async updateFinanceEntry(userId: string, type: "debit" | "credit", index: number, entry: FinanceEntry): Promise<Finance> {
    const finance = await this.getFinance(userId);

    if (type === "debit" && index >= 0 && index < finance.debitList.length) {
      finance.debitList[index] = entry;
      finance.totalDebit = finance.debitList.reduce((sum, e) => sum + e.amount, 0);
    } else if (type === "credit" && index >= 0 && index < finance.creditList.length) {
      finance.creditList[index] = entry;
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

  // Personal Memory methods
  async getMemories(userId: string): Promise<PersonalMemory[]> {
    const memories = await PersonalMemoryModel.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return memories;
  }

  async getMemoriesByDate(userId: string, date: string): Promise<PersonalMemory[]> {
    const memories = await PersonalMemoryModel.find({ userId, date })
      .sort({ createdAt: -1 })
      .lean();
    return memories;
  }

  async getMemory(id: string): Promise<PersonalMemory | undefined> {
    const memory = await PersonalMemoryModel.findOne({ id }).lean();
    return memory || undefined;
  }

  async createMemory(userId: string, data: InsertPersonalMemory): Promise<PersonalMemory> {
    const id = randomUUID();
    const memory: PersonalMemory = {
      id,
      userId,
      date: data.date,
      title: data.title,
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    await PersonalMemoryModel.create(memory);
    return memory;
  }

  async updateMemory(id: string, data: UpdatePersonalMemory): Promise<PersonalMemory | undefined> {
    const memory = await PersonalMemoryModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return memory || undefined;
  }

  async deleteMemory(id: string): Promise<boolean> {
    const result = await PersonalMemoryModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Wishlist methods
  async getWishlist(userId: string): Promise<Wishlist[]> {
    const wishlist = await WishlistModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return wishlist;
  }

  async getWishlistItem(id: string): Promise<Wishlist | undefined> {
    const item = await WishlistModel.findOne({ id }).lean();
    return item || undefined;
  }

  async createWishlistItem(userId: string, data: InsertWishlist): Promise<Wishlist> {
    const id = randomUUID();
    const wishlist: Wishlist = {
      id,
      userId,
      wish: data.wish,
      category: data.category,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await WishlistModel.create(wishlist);
    return wishlist;
  }

  async updateWishlistItem(id: string, data: UpdateWishlist): Promise<Wishlist | undefined> {
    const item = await WishlistModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return item || undefined;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    const result = await WishlistModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Daily Task methods
  async getDailyTasks(userId: string): Promise<DailyTask[]> {
    const tasks = await DailyTaskModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return tasks;
  }

  async getDailyTask(id: string): Promise<DailyTask | undefined> {
    const task = await DailyTaskModel.findOne({ id }).lean();
    return task || undefined;
  }

  async createDailyTask(userId: string, data: InsertDailyTask): Promise<DailyTask> {
    const id = randomUUID();
    const task: DailyTask = {
      id,
      userId,
      taskName: data.taskName,
      frequency: data.frequency,
      startDate: data.startDate,
      completions: [],
      createdAt: new Date().toISOString(),
    };
    await DailyTaskModel.create(task);
    return task;
  }

  async updateDailyTask(id: string, data: UpdateDailyTask): Promise<DailyTask | undefined> {
    const task = await DailyTaskModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return task || undefined;
  }

  async toggleDailyTaskCompletion(id: string, date: string): Promise<DailyTask | undefined> {
    const task = await DailyTaskModel.findOne({ id }).lean();
    if (!task) return undefined;

    let completions: string[];
    if (task.completions.includes(date)) {
      completions = task.completions.filter((d) => d !== date);
    } else {
      completions = [...task.completions, date];
    }

    const updated = await DailyTaskModel.findOneAndUpdate(
      { id },
      { $set: { completions } },
      { new: true, lean: true }
    );
    return updated || undefined;
  }

  async deleteDailyTask(id: string): Promise<boolean> {
    const result = await DailyTaskModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Reminder methods
  async getReminders(userId: string): Promise<Reminder[]> {
    return ReminderModel.find({ userId }).sort({ remindAt: 1 }).lean();
  }

  async getPendingReminders(userId: string, now: string): Promise<Reminder[]> {
    return ReminderModel.find({
      userId,
      status: "pending",
      remindAt: { $lte: now },
    })
      .sort({ remindAt: 1 })
      .lean();
  }

  async getDueRemindersForPush(now: string): Promise<Reminder[]> {
    return ReminderModel.find({
      status: "pending",
      pushSent: false,
      remindAt: { $lte: now },
    })
      .sort({ remindAt: 1 })
      .lean();
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const reminder = await ReminderModel.findOne({ id }).lean();
    return reminder || undefined;
  }

  async createReminder(userId: string, data: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const reminder: Reminder = {
      id,
      userId,
      title: data.title,
      description: data.description,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      remindAt: data.remindAt,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await ReminderModel.create(reminder);
    return reminder;
  }

  async updateReminder(id: string, data: UpdateReminder): Promise<Reminder | undefined> {
    const reminder = await ReminderModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true, lean: true }
    );
    return reminder || undefined;
  }

  async markReminderPushSent(id: string): Promise<void> {
    await ReminderModel.updateOne({ id }, { $set: { pushSent: true } });
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await ReminderModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async saveOneSignalPlayerId(userId: string, playerId: string): Promise<void> {
    await UserModel.updateOne({ id: userId }, { $set: { oneSignalPlayerId: playerId } });
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

  // Daily Expense methods (month-based) - stub implementations already added above

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
    const totalAmount = data.emiAmountPerMonth * data.emiDuration;
    const frequency = data.paymentFrequency || "monthly";
    let startDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.startMonth)) {
      startDate = parse(data.startMonth, "yyyy-MM-dd", new Date());
    } else {
      startDate = parse(data.startMonth, "yyyy-MM", new Date());
    }
    const emiSchedule: EMIScheduleItem[] = [];
    for (let i = 0; i < data.emiDuration; i++) {
      let scheduleDate: Date;
      switch (frequency) {
        case "weekly":
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * 7);
          break;
        case "twice_monthly":
          const monthOff = Math.floor(i / 2);
          scheduleDate = addMonths(startDate, monthOff);
          scheduleDate.setDate(i % 2 === 0 ? 1 : 15);
          break;
        case "custom":
          const interval = data.customIntervalDays || 30;
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * interval);
          break;
        default:
          scheduleDate = addMonths(startDate, i);
          break;
      }
      emiSchedule.push({
        date: format(scheduleDate, "yyyy-MM-dd"),
        amount: data.emiAmountPerMonth,
        status: "unpaid",
      });
    }
    const emi: EMI = {
      id, userId, emiTitle: data.emiTitle, startMonth: data.startMonth,
      paymentFrequency: frequency, customIntervalDays: data.customIntervalDays,
      emiAmountPerMonth: data.emiAmountPerMonth, emiDuration: data.emiDuration,
      emiSchedule, remainingAmount: totalAmount, totalAmount,
      isKuri: data.isKuri || false, kuriReceivedAmount: 0,
    };
    this.emis.set(id, emi);
    return emi;
  }

  async updateEmi(id: string, data: InsertEMI): Promise<EMI | undefined> {
    const emi = this.emis.get(id);
    if (!emi) return undefined;

    const totalAmount = data.emiAmountPerMonth * data.emiDuration;
    const frequency = data.paymentFrequency || "monthly";
    let startDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.startMonth)) {
      startDate = parse(data.startMonth, "yyyy-MM-dd", new Date());
    } else {
      startDate = parse(data.startMonth, "yyyy-MM", new Date());
    }
    const newSchedule: EMIScheduleItem[] = [];
    for (let i = 0; i < data.emiDuration; i++) {
      let scheduleDate: Date;
      switch (frequency) {
        case "weekly":
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * 7);
          break;
        case "twice_monthly": {
          const monthOff = Math.floor(i / 2);
          scheduleDate = addMonths(startDate, monthOff);
          scheduleDate.setDate(i % 2 === 0 ? 1 : 15);
          break;
        }
        case "custom": {
          const interval = data.customIntervalDays || 30;
          scheduleDate = new Date(startDate);
          scheduleDate.setDate(startDate.getDate() + i * interval);
          break;
        }
        default:
          scheduleDate = addMonths(startDate, i);
          break;
      }
      const existingStatus = emi.emiSchedule[i]?.status ?? "unpaid";
      newSchedule.push({
        date: format(scheduleDate, "yyyy-MM-dd"),
        amount: data.emiAmountPerMonth,
        status: existingStatus,
      });
    }
    const paidAmount = newSchedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0);
    const updatedEmi: EMI = {
      ...emi,
      emiTitle: data.emiTitle,
      startMonth: data.startMonth,
      paymentFrequency: frequency,
      customIntervalDays: data.customIntervalDays,
      emiAmountPerMonth: data.emiAmountPerMonth,
      emiDuration: data.emiDuration,
      isKuri: data.isKuri,
      emiSchedule: newSchedule,
      totalAmount,
      remainingAmount: totalAmount - paidAmount,
    };
    this.emis.set(id, updatedEmi);
    return updatedEmi;
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

  async updateKuriReceived(id: string, amount: number, date?: string): Promise<EMI | undefined> {
    const emi = this.emis.get(id);
    if (!emi) return undefined;
    emi.kuriReceivedAmount = amount;
    if (date) emi.kuriReceivedDate = date;
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
      date: data.date,
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

  async updateFinanceEntry(userId: string, type: "debit" | "credit", index: number, entry: FinanceEntry): Promise<Finance> {
    const finance = await this.getFinance(userId);

    if (type === "debit" && index >= 0 && index < finance.debitList.length) {
      finance.debitList[index] = entry;
      finance.totalDebit = finance.debitList.reduce((sum, e) => sum + e.amount, 0);
    } else if (type === "credit" && index >= 0 && index < finance.creditList.length) {
      finance.creditList[index] = entry;
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

  // Daily Expense methods (month-based) - stub implementations
  async getExpenseByMonth(userId: string, month: string): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async getAllExpenseMonths(userId: string): Promise<DailyExpense[]> {
    return [];
  }

  async createExpenseMonth(userId: string, data: InsertDailyExpense): Promise<DailyExpense> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateExpenseMonthSalary(userId: string, month: string, salaryCredited: number): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async updateExpenseMonthBalanceDistribution(userId: string, month: string, balanceSBI: number, balanceKGB: number, balanceCash: number): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async addExpenseDay(userId: string, month: string, data: InsertExpenseDay): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async updateExpenseDay(userId: string, month: string, data: UpdateExpenseDay): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async deleteExpenseDay(userId: string, month: string, date: string): Promise<DailyExpense | undefined> {
    return undefined;
  }

  async deleteExpenseDayItem(userId: string, month: string, date: string, itemId: string): Promise<DailyExpense | undefined> {
    return undefined;
  }

  // Personal Memory methods - stub implementations
  async getMemories(userId: string): Promise<PersonalMemory[]> {
    return [];
  }

  async getMemoriesByDate(userId: string, date: string): Promise<PersonalMemory[]> {
    return [];
  }

  async getMemory(id: string): Promise<PersonalMemory | undefined> {
    return undefined;
  }

  async createMemory(userId: string, data: InsertPersonalMemory): Promise<PersonalMemory> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateMemory(id: string, data: UpdatePersonalMemory): Promise<PersonalMemory | undefined> {
    return undefined;
  }

  async deleteMemory(id: string): Promise<boolean> {
    return false;
  }

  // Wishlist methods - stub implementations
  async getWishlist(userId: string): Promise<Wishlist[]> {
    return [];
  }

  async getWishlistItem(id: string): Promise<Wishlist | undefined> {
    return undefined;
  }

  async createWishlistItem(userId: string, data: InsertWishlist): Promise<Wishlist> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateWishlistItem(id: string, data: UpdateWishlist): Promise<Wishlist | undefined> {
    return undefined;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    return false;
  }

  // Daily Task methods - stub implementations
  async getDailyTasks(userId: string): Promise<DailyTask[]> {
    return [];
  }

  async getDailyTask(id: string): Promise<DailyTask | undefined> {
    return undefined;
  }

  async createDailyTask(userId: string, data: InsertDailyTask): Promise<DailyTask> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateDailyTask(id: string, data: UpdateDailyTask): Promise<DailyTask | undefined> {
    return undefined;
  }

  async toggleDailyTaskCompletion(id: string, date: string): Promise<DailyTask | undefined> {
    return undefined;
  }

  async deleteDailyTask(id: string): Promise<boolean> {
    return false;
  }

  // Reminder methods - stub implementations
  async getReminders(userId: string): Promise<Reminder[]> {
    return [];
  }

  async getPendingReminders(userId: string, now: string): Promise<Reminder[]> {
    return [];
  }

  async getDueRemindersForPush(now: string): Promise<Reminder[]> {
    return [];
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    return undefined;
  }

  async createReminder(userId: string, data: InsertReminder): Promise<Reminder> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateReminder(id: string, data: UpdateReminder): Promise<Reminder | undefined> {
    return undefined;
  }

  async markReminderPushSent(id: string): Promise<void> {
    // no-op
  }

  async deleteReminder(id: string): Promise<boolean> {
    return false;
  }

  async saveOneSignalPlayerId(userId: string, playerId: string): Promise<void> {
    // no-op
  }
}

// Use MongoStorage as the default storage
export const storage = new MongoStorage();

