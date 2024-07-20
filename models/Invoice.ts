import mongoose from "mongoose";
import { CustomerDoc } from "./Customer";

enum Status {
  PENDING = "pending",
  PAID = "paid",
}
interface IInvoice {
  customer: CustomerDoc;
  amount: number;
  date: Date;
  status: Status;
}

interface InvoiceModel extends mongoose.Model<InvoiceDoc> {
  build(attrs: IInvoice): InvoiceDoc;
}

interface InvoiceDoc extends IInvoice, mongoose.Document {}

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      required: true,
      default: Status.PENDING,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

invoiceSchema.statics.build = (attrs: IInvoice) => {
  return new Invoice(attrs);
};

const Invoice = (mongoose.models.Invoice ||
  mongoose.model<InvoiceDoc, InvoiceModel>(
    "Invoice",
    invoiceSchema
  )) as InvoiceModel;
export { Invoice, Status };
export type { IInvoice, InvoiceDoc };
