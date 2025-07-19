import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./mongodb";
import { insertExpenseSchema, insertPersonSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all people
  app.get("/api/people", async (req, res) => {
    try {
      const people = await storage.getPeople();
      res.json(people);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch people" });
    }
  });

  // Get people with balances
  app.get("/api/people/balances", async (req, res) => {
    try {
      const peopleWithBalances = await storage.getPeopleWithBalances();
      res.json(peopleWithBalances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch people with balances" });
    }
  });

  // Create a new person
  app.post("/api/people", async (req, res) => {
    try {
      const personData = insertPersonSchema.parse(req.body);
      const person = await storage.createPerson(personData);
      res.status(201).json(person);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid person data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create person" });
      }
    }
  });

  // Delete a person
  app.delete("/api/people/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deletePerson(id);
      if (!deleted) {
        res.status(404).json({ message: "Person not found" });
        return;
      }
      res.json({ message: "Person deleted successfully" });
    } catch (error) {
      console.error("Delete person error:", error);
      res.status(500).json({ message: "Failed to delete person" });
    }
  });

  // Get all expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  // Get a specific expense
  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const expense = await storage.getExpense(id);
      if (!expense) {
        res.status(404).json({ message: "Expense not found" });
        return;
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  // Get expense details with payment history
  app.get("/api/expenses/:id/details", async (req, res) => {
    try {
      const id = req.params.id;
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        res.status(404).json({ message: "Expense not found" });
        return;
      }

      const payments = await storage.getPayments(id);
      
      const expenseWithPayments = {
        ...expense,
        payments: payments
      };

      res.json(expenseWithPayments);
    } catch (error) {
      console.error("Error fetching expense details:", error);
      res.status(500).json({ message: "Failed to fetch expense details" });
    }
  });

  // Create a new expense
  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create expense" });
      }
    }
  });

  // Mark expense as paid (full or partial)
  app.patch("/api/expenses/:id/pay", async (req, res) => {
    try {
      const id = req.params.id;
      const { amount, paymentType = "full", notes = null } = req.body;
      
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ message: "Invalid payment amount" });
        return;
      }

      const expense = await storage.getExpense(id);
      if (!expense) {
        res.status(404).json({ message: "Expense not found" });
        return;
      }

      const currentAmountPaid = parseFloat(expense.amountPaid || "0");
      const newAmountPaid = currentAmountPaid + parseFloat(amount);
      const totalAmount = parseFloat(expense.amountPaidFor);
      
      const isPaid = newAmountPaid >= totalAmount;
      
      const updatedExpense = await storage.updateExpense(id, {
        amountPaid: newAmountPaid.toFixed(2),
        isPaid,
        paidAt: isPaid ? new Date() : expense.paidAt,
      });

      // Create payment record
      await storage.createPayment({
        expenseId: id,
        amount: amount.toString(),
        paymentType: paymentType,
        notes: notes,
      });

      res.json(updatedExpense);
    } catch (error) {
      console.error("Payment update error:", error);
      res.status(500).json({ message: "Failed to update payment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get total balances
  app.get("/api/balances", async (req, res) => {
    try {
      const balances = await storage.getTotalBalances();
      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch balances" });
    }
  });

  // Get payments for an expense
  app.get("/api/expenses/:id/payments", async (req, res) => {
    try {
      const id = req.params.id;
      const payments = await storage.getPayments(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
