import { User } from "@/models/User";
import { dbConnect } from "../lib/dbConnect";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";
import { Invoice, Status } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Revenue } from "@/models/Revenue";
import mongoose from "mongoose";

async function seedUsers() {
  const insertedUsers = await Promise.all(
    users.map((user) => {
      const newUser = User.build({
        name: user.name,
        email: user.email,
        password: user.password,
      });
      return newUser.save();
    })
  );
  return insertedUsers;
}

async function seedInvoices() {
  const customers = await Customer.find({});
  const newInvoices = [];
  for (let i = 0; i < invoices.length; i++) {
    const element = invoices[i];
    const newInvoice = Invoice.build({
      customer: customers[i % customers.length],
      amount: element.amount,
      date: new Date(element.date),
      status: element.status === "pending" ? Status.PENDING : Status.PAID,
    });
    newInvoices.push(newInvoice.save());
  }
  return await Promise.all(newInvoices);
}

async function seedCustomers() {
  const insertedCustomers = await Promise.all(
    customers.map(async (customer) => {
      const newCustomer = Customer.build({
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
      });
      return newCustomer.save();
    })
  );

  return insertedCustomers;
}

async function seedRevenue() {
  const insertedRevenue = await Promise.all(
    revenue.map((rev) => {
      const newRevenue = Revenue.build({
        month: rev.month,
        revenue: rev.revenue,
      });
      return newRevenue.save();
    })
  );

  return insertedRevenue;
}

export async function GET() {
  try {
    await dbConnect();
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();

    return Response.json(
      { message: "Database seeded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    // await mongoose.connection.db.dropDatabase();
    return Response.json({ error }, { status: 500 });
  }
}
