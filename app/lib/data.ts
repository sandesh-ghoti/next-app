import { formatCurrency } from "./utils";
import { dbConnect } from "./dbConnect";
import { Revenue } from "@/models/Revenue";
import { Invoice, Status } from "@/models/Invoice";
import { Customer, CustomerDoc } from "@/models/Customer";
import {
  CustomerField,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
} from "./definitions";

export async function fetchRevenue() {
  await dbConnect();
  try {
    console.log("Fetching revenue data...");
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    const data = await Revenue.find({});
    console.log("Data fetch completed after 3 seconds.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  await dbConnect();

  try {
    const data = await Invoice.find({})
      .populate({
        path: "customer",
        select: "name email image_url",
      })
      .sort({ date: -1 });
    const latestInvoices: LatestInvoice[] = data.map((invoice: any) => ({
      id: invoice._id,
      name: invoice.customer.name,
      image_url: invoice.customer.image_url,
      email: invoice.customer.email,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices.slice(0, 5);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  await dbConnect();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = Invoice.find({});
    const customerCountPromise = Customer.find({});
    const invoiceStatusPromise = Invoice.aggregate([
      {
        $group: {
          _id: null,
          paid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = data[0].length ?? 0;
    const numberOfCustomers = data[1].length ?? 0;
    const totalPaidInvoices = formatCurrency(data[2][0]?.paid ?? 0);
    const totalPendingInvoices = formatCurrency(data[2][0]?.pending ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

export interface InvoiceFilter {
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  date?: string;
  status?: string;
}
const ITEMS_PER_PAGE = 6;
/**
 * this function only supporting searching base on customer field data
 * @param query to search invoices by customer field data
 * @param currentPage
 * @returns
 */
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  await dbConnect();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const regexQuery = new RegExp(query, "i"); // case-insensitive regex
  // let amountQuery = {};
  // let dateQuery = {};
  // let statusQuery = {};
  // // Try to parse query as number for amount search
  // const amount = parseFloat(query);
  // if (!isNaN(amount)) {
  //   amountQuery = { amount: amount };
  // }

  // // Try to parse query as date for date search
  // const date = new Date(query);
  // if (!isNaN(date.getTime())) {
  //   // Search for invoices on the same day
  //   const nextDay = new Date(date);
  //   nextDay.setDate(date.getDate() + 1);
  //   dateQuery = {
  //     date: { $gte: date, $lt: nextDay },
  //   };
  // }
  // if (regexQuery.test(Status.PAID) || regexQuery.test(Status.PENDING)) {
  //   statusQuery = {
  //     status: regexQuery.test(Status.PAID) ? Status.PAID : Status.PENDING,
  //   };
  // }
  try {
    const invoices = await Invoice.find({
      // $or: [amountQuery, dateQuery, statusQuery],
    })
      .populate({
        path: "customer",
        match: {
          $or: [{ name: regexQuery }, { email: regexQuery }],
        },
        select: "name email image_url",
      })
      .sort({ date: -1 })
      .skip(offset)
      .limit(ITEMS_PER_PAGE)
      .exec();
    // Filter out invoices with null customers (those that didn't match the customer filter)
    const filteredInvoices: InvoicesTable[] = invoices
      .filter((invoice) => invoice.customer !== null)
      .map((invoice): InvoicesTable => {
        return {
          id: invoice.id as string,
          customer_id: invoice.customer.id as string,
          name: invoice.customer.name,
          email: invoice.customer.email,
          image_url: invoice.customer.image_url,
          date: invoice.date.toLocaleString(),
          amount: invoice.amount,
          status: invoice.status,
        };
      });
    return filteredInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  await dbConnect();

  try {
    const regexQuery = new RegExp(query, "i");
    const invoices = await Invoice.find({})
      .populate({
        path: "customer",
        match: {
          $or: [{ name: regexQuery }, { email: regexQuery }],
        },
        select: "name email image_url",
      })
      .exec();
    const filteredInvoices = invoices.filter(
      (invoice) => invoice.customer !== null
    );
    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  await dbConnect();

  try {
    const invoice = await Invoice.findById(id).populate("customer", "id");
    if (!invoice) {
      throw new Error("Invoice not found.");
    }
    const inv: InvoiceForm = {
      id: invoice.id,
      customer_id: invoice.customer.id,
      amount: invoice.amount / 100,
      status: invoice.status,
    };
    return inv;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  await dbConnect();

  try {
    const customers: CustomerDoc[] = await Customer.find({}, "id name")
      .sort({ name: 1 })
      .exec();
    const cust = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
    }));
    return cust;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}
export interface FilterCustomer {
  name?: string;
  email?: string;
}
export async function fetchFilteredCustomers(filter: FilterCustomer) {
  await dbConnect();

  try {
    const matchConditions: any = {};

    if (filter.name) {
      matchConditions.name = { $regex: new RegExp(filter.name, "i") };
    }

    if (filter.email) {
      matchConditions.email = { $regex: new RegExp(filter.email, "i") };
    }
    const data = await Customer.aggregate([
      {
        $lookup: {
          from: "invoices",
          localField: "_id",
          foreignField: "customer",
          as: "invoices",
        },
      },
      {
        $match: matchConditions,
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          email: 1,
          image_url: 1,
          total_invoices: { $size: "$invoices" },
          total_pending: {
            $sum: {
              $cond: [
                { $eq: ["$invoices.status", "pending"] },
                "$invoices.amount",
                0,
              ],
            },
          },
          total_paid: {
            $sum: {
              $cond: [
                { $eq: ["$invoices.status", "paid"] },
                "$invoices.amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { name: 1 } },
    ]);

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
