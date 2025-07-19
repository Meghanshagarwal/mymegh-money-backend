import { MongoClient, Db, ObjectId } from 'mongodb';
import type { 
  Person, 
  InsertPerson,
  Expense,
  InsertExpense,
  Payment,
  InsertPayment,
  PersonWithBalance,
  ExpenseWithPerson
} from "../shared/schema";

const MONGODB_URI = "mongodb+srv://meghanshagarwal3110:meghansh3110@booster.moyfe3g.mongodb.net/?retryWrites=true&w=majority&appName=Booster";
const DB_NAME = "splittracker";

export interface IStorage {
  // People
  getPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  deletePerson(id: string): Promise<boolean>;
  
  // Expenses
  getExpenses(): Promise<ExpenseWithPerson[]>;
  getExpense(id: string): Promise<ExpenseWithPerson | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined>;
  
  // Payments
  getPayments(expenseId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Analytics
  getPeopleWithBalances(): Promise<PersonWithBalance[]>;
  getTotalBalances(): Promise<{ totalOwed: number; totalOwing: number; netBalance: number }>;
}

class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private isConnected: boolean = false;

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
    this.db = this.client.db(DB_NAME);
  }

  private async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to MongoDB');
      
      // Initialize with sample data if collections are empty
      await this.initializeSampleData();
    }
  }

  private async initializeSampleData() {
    const peopleCount = await this.db.collection('people').countDocuments();
    if (peopleCount === 0) {
      // Add sample people
      const people = [
        { name: "John Smith", initials: "JS", color: "#00D4AA", avatar: "🧑‍💻", createdAt: new Date() },
        { name: "Emily Rodriguez", initials: "EM", color: "#FF6B6B", avatar: "👩‍🎨", createdAt: new Date() },
        { name: "Mike Johnson", initials: "MJ", color: "#F39C12", avatar: "🧑‍🍳", createdAt: new Date() },
      ];
      
      const insertedPeople = await this.db.collection('people').insertMany(people);
      const personIds = Object.values(insertedPeople.insertedIds);
      
      // Add sample expenses
      const expenses = [
        {
          amountPaidFor: "45.50",
          paidForPersonId: personIds[0].toString(),
          category: "food",
          paymentMethod: "upi",
          bankApp: "gpay",
          notes: "Lunch at restaurant",
          isPaid: false,
          amountPaid: "0",
          createdAt: new Date(),
        },
        {
          amountPaidFor: "32.00",
          paidForPersonId: personIds[1].toString(),
          category: "other",
          paymentMethod: "credit_card",
          notes: "Movie tickets",
          isPaid: true,
          amountPaid: "32.00",
          createdAt: new Date(),
          paidAt: new Date(),
        },
      ];
      
      await this.db.collection('expenses').insertMany(expenses);
    } else {
      // Update existing people without avatars
      await this.db.collection('people').updateMany(
        { avatar: { $exists: false } },
        { $set: { avatar: "👤" } }
      );
    }
  }

  async getPeople(): Promise<Person[]> {
    await this.connect();
    const people = await this.db.collection('people').find({}).toArray();
    return people.map(p => ({ 
      id: p._id.toString(),
      name: p.name,
      initials: p.initials,
      color: p.color,
      avatar: p.avatar || undefined
    }));
  }

  async getPerson(id: string): Promise<Person | undefined> {
    await this.connect();
    const person = await this.db.collection('people').findOne({ _id: new ObjectId(id) });
    return person ? { 
      id: person._id.toString(),
      name: person.name,
      initials: person.initials,
      color: person.color,
      avatar: person.avatar || undefined
    } : undefined;
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    await this.connect();
    const personData = { ...insertPerson, createdAt: new Date() };
    const result = await this.db.collection('people').insertOne(personData);
    return { 
      id: result.insertedId.toString(),
      name: insertPerson.name,
      initials: insertPerson.initials,
      color: insertPerson.color,
      avatar: insertPerson.avatar || undefined
    };
  }

  async deletePerson(id: string): Promise<boolean> {
    await this.connect();
    const result = await this.db.collection('people').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getExpenses(): Promise<ExpenseWithPerson[]> {
    await this.connect();
    const expenses = await this.db.collection('expenses').find({}).sort({ createdAt: -1 }).toArray();
    const result: ExpenseWithPerson[] = [];
    
    for (const expense of expenses) {
      const person = await this.getPerson(expense.paidForPersonId);
      if (person) {
        result.push({
          id: expense._id.toString(),
          amountPaidFor: expense.amountPaidFor,
          paidForPersonId: expense.paidForPersonId,
          category: expense.category,
          paymentMethod: expense.paymentMethod,
          bankApp: expense.bankApp,
          notes: expense.notes,
          isPaid: expense.isPaid,
          amountPaid: expense.amountPaid,
          createdAt: expense.createdAt,
          paidAt: expense.paidAt,
          person,
        });
      }
    }
    
    return result;
  }

  async getExpense(id: string): Promise<ExpenseWithPerson | undefined> {
    await this.connect();
    const expense = await this.db.collection('expenses').findOne({ _id: new ObjectId(id) });
    if (!expense) return undefined;
    
    const person = await this.getPerson(expense.paidForPersonId);
    if (!person) return undefined;
    
    return {
      id: expense._id.toString(),
      amountPaidFor: expense.amountPaidFor,
      paidForPersonId: expense.paidForPersonId,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      bankApp: expense.bankApp,
      notes: expense.notes,
      isPaid: expense.isPaid,
      amountPaid: expense.amountPaid,
      createdAt: expense.createdAt,
      paidAt: expense.paidAt,
      person,
    };
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    await this.connect();
    const expenseData = {
      ...insertExpense,
      isPaid: insertExpense.isPaid || false,
      amountPaid: insertExpense.amountPaid || "0",
      createdAt: new Date(),
    };
    const result = await this.db.collection('expenses').insertOne(expenseData);
    return { 
      id: result.insertedId.toString(),
      amountPaidFor: expenseData.amountPaidFor,
      paidForPersonId: expenseData.paidForPersonId,
      category: expenseData.category,
      paymentMethod: expenseData.paymentMethod,
      bankApp: expenseData.bankApp,
      notes: expenseData.notes,
      isPaid: expenseData.isPaid,
      amountPaid: expenseData.amountPaid,
      createdAt: expenseData.createdAt,
      paidAt: null,
    };
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined> {
    await this.connect();
    const result = await this.db.collection('expenses').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) return undefined;
    
    return {
      id: result._id.toString(),
      amountPaidFor: result.amountPaidFor,
      paidForPersonId: result.paidForPersonId,
      category: result.category,
      paymentMethod: result.paymentMethod,
      bankApp: result.bankApp,
      notes: result.notes,
      isPaid: result.isPaid,
      amountPaid: result.amountPaid,
      createdAt: result.createdAt,
      paidAt: result.paidAt,
    };
  }

  async getPayments(expenseId: string): Promise<Payment[]> {
    await this.connect();
    const payments = await this.db.collection('payments').find({ expenseId }).toArray();
    return payments.map(p => ({
      id: p._id.toString(),
      expenseId: p.expenseId,
      amount: p.amount,
      paymentType: p.paymentType || "full",
      notes: p.notes || null,
      createdAt: p.createdAt,
    }));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    await this.connect();
    const paymentData = { ...insertPayment, createdAt: new Date() };
    const result = await this.db.collection('payments').insertOne(paymentData);
    return {
      id: result.insertedId.toString(),
      expenseId: paymentData.expenseId,
      amount: paymentData.amount,
      paymentType: paymentData.paymentType,
      notes: paymentData.notes,
      createdAt: paymentData.createdAt,
    };
  }

  async getPeopleWithBalances(): Promise<PersonWithBalance[]> {
    await this.connect();
    const people = await this.getPeople();
    const result: PersonWithBalance[] = [];
    
    for (const person of people) {
      const expenses = await this.db.collection('expenses').find({ paidForPersonId: person.id }).toArray();
      
      let totalOwed = 0;
      let totalOwing = 0;
      const transactionCount = expenses.length;
      
      for (const expense of expenses) {
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

export const storage = new MongoStorage();