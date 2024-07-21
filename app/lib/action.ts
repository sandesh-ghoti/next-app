"use server";
import { z } from "zod";
import { Invoice, Status } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum([Status.PENDING, Status.PAID]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  const date = new Date();
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }
  const invoice = Invoice.build({
    customer,
    amount: amountInCents,
    status,
    date,
  });
  await invoice.save();
  console.log(amountInCents, customerId, typeof amount, "date", date);
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    id: formData.get("id"),
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }
  invoice.customer = customer;
  invoice.amount = amountInCents;
  invoice.status = status;
  await invoice.save();
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  await invoice.deleteOne();
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
