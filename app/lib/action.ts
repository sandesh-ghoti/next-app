"use server";
import { z } from "zod";
import { Invoice, Status } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum([Status.PENDING, Status.PAID], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date();
  try {
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
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }
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
  try {
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
  } catch (error) {
    return {
      message: "Database Error: Failed to Update Invoice.",
    };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    await invoice.deleteOne();
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice." };
  } catch (error) {
    return {
      message: "Database Error: Failed to Delete Invoice.",
    };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    // we have handled form validation at auth.ts
    await signIn("credentials", formData);
  } catch (error) {
    console.log("gettting CredentialsSignin error");
    if (error instanceof AuthError) {
      console.log("is it Auth error instance", error.type);
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
