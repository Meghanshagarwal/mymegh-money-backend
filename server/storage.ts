import { 
  people, 
  expenses, 
  payments,
  type Person, 
  type InsertPerson,
  type Expense,
  type InsertExpense,
  type Payment,
  type InsertPayment,
  type PersonWithBalance,
  type ExpenseWithPerson
} from "@shared/schema";

export interface IStorage {
  // People
  getPeople(): Promise<Person[]>;
  getPerson(id: number): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  
  // Expenses
  getExpenses(): Promise<ExpenseWithPerson[]>;
  getExpense(id: number): Promise<ExpenseWithPerson | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined>;
  
  // Payments
  getPayments(expenseId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Analytics
  getPeopleWithBalances(): Promise<PersonWithBalance[]>;
  getTotalBalances(): Promise<{ totalOwed: number; totalOwing: number; netBalance: number }>;
}

export class MemStorage implements IStorage {
  private people: Map<number, Person>;
  private expenses: Map<number, Expense>;
  private payments: Map<number, Payment>;
  private currentPersonId: number;
  private currentExpenseId: number;
  private currentPaymentId: number;

  constructor() {
    this.people = new Map();
    this.expenses = new Map();
    this.payments = new Map();
    this.currentPersonId = 1;
    this.currentExpenseId = 1;
    this.currentPaymentId = 1;
    
    // Add some default people
    this.createPerson({ name: "John Smith", initials: "JS", color: "#00D4AA" });
    this.createPerson({ name: "Emily Rodriguez", initials: "EM", color: "#FF6B6B" });
    this.createPerson({ name: "Mike Johnson", initials: "MJ", color: "#F39C12" });
    
    // Add some sample expenses to test the new payment method selection
    this.createExpense({ 
      amountPaidFor: "45.50", 
      paidForPersonId: 1, 
      paymentMethod: "upi", 
      bankApp: "gpay", 
      category: "food", 
      notes: "Lunch at restaurant",
      isPaid: false, 
      amountPaid: "0" 
    });
    
    this.createExpense({ 
      amountPaidFor: "32.00", 
      paidForPersonId: 2, 
      paymentMethod: "credit_card", 
      bankApp: null, 
      category: "other", 
      notes: "Movie tickets",
      isPaid: true, 
      amountPaid: "32.00" 
    });
  }

  async getPeople(): Promise<Person[]> {
    return Array.from(this.people.values());
  }

  async getPerson(id: number): Promise<Person | undefined> {
    return this.people.get(id);
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const id = this.currentPersonId++;
    const person: Person = { ...insertPerson, id };
    this.people.set(id, person);
    return person;
  }

  async getExpenses(): Promise<ExpenseWithPerson[]> {
    const expensesList = Array.from(this.expenses.values());
    const result: ExpenseWithPerson[] = [];
    
    for (const expense of expensesList) {
      const person = this.people.get(expense.paidForPersonId);
      if (person) {
        result.push({ ...expense, person });
      }
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getExpense(id: number): Promise<ExpenseWithPerson | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const person = this.people.get(expense.paidForPersonId);
    if (!person) return undefined;
    
    return { ...expense, person };
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expense: Expense = {
      ...insertExpense,
      id,
      bankApp: insertExpense.bankApp || null,
      notes: insertExpense.notes || null,
      isPaid: insertExpense.isPaid || false,
      amountPaid: insertExpense.amountPaid || "0",
      createdAt: new Date(),
      paidAt: null,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async getPayments(expenseId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.expenseId === expenseId);
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const payment: Payment = {
      ...insertPayment,
      id,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPeopleWithBalances(): Promise<PersonWithBalance[]> {
    const peopleList = Array.from(this.people.values());
    const result: PersonWithBalance[] = [];
    
    for (const person of peopleList) {
      const personExpenses = Array.from(this.expenses.values()).filter(e => e.paidForPersonId === person.id);
      
      let totalOwed = 0;
      let totalOwing = 0;
      let transactionCount = personExpenses.length;
      
      for (const expense of personExpenses) {
        const amount = parseFloat(expense.amountPaidFor);
        const amountPaid = parseFloat(expense.amountPaid || "0");
        const remaining = amount - amountPaid;
        
        if (remaining > 0) {
          totalOwed += remaining;
        } else if (remaining < 0) {
          totalOwing += Math.abs(remaining);
        }
      }
      
      const netBalance = totalOwed - totalOwing;
      
      result.push({
        ...person,
        totalOwed,
        totalOwing,
        netBalance,
        transactionCount,
      });
    }
    
    return result;
  }

  async getTotalBalances(): Promise<{ totalOwed: number; totalOwing: number; netBalance: number }> {
    const peopleWithBalances = await this.getPeopleWithBalances();
    
    let totalOwed = 0;
    let totalOwing = 0;
    
    for (const person of peopleWithBalances) {
      totalOwed += person.totalOwed;
      totalOwing += person.totalOwing;
    }
    
    return {
      totalOwed,
      totalOwing,
      netBalance: totalOwed - totalOwing,
    };
  }
}

export const storage = new MemStorage();
