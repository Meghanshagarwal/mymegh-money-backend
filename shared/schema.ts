import { z } from "zod";

// MongoDB-style types using string IDs
export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  color: z.string(),
  avatar: z.string().optional(),
});

export const expenseSchema = z.object({
  id: z.string(),
  amountPaidFor: z.string(),
  paidForPersonId: z.string(),
  category: z.string(),
  paymentMethod: z.string(),
  bankApp: z.string().nullable(),
  notes: z.string().nullable(),
  isPaid: z.boolean(),
  amountPaid: z.string().nullable(),
  createdAt: z.date(),
  paidAt: z.date().nullable(),
});

export const paymentSchema = z.object({
  id: z.string(),
  expenseId: z.string(),
  amount: z.string(),
  paymentType: z.enum(["full", "partial", "custom"]),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export const insertPersonSchema = personSchema.omit({
  id: true,
});

export const insertExpenseSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export const insertPaymentSchema = paymentSchema.omit({
  id: true,
  createdAt: true,
});

export type Person = z.infer<typeof personSchema>;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Extended types for API responses
export type PersonWithBalance = Person & {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  transactionCount: number;
};

export type ExpenseWithPerson = Expense & {
  person: Person;
};

export type ExpenseWithPayments = ExpenseWithPerson & {
  payments: Payment[];
};
