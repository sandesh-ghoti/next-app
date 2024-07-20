import { Password } from "@/app/lib/passwordEncryptDecrypt";
import mongoose from "mongoose";

interface ICustomer {
  name: string;
  email: string;
  image_url: string;
}

interface CustomerModel extends mongoose.Model<CustomerDoc> {
  build(attrs: ICustomer): CustomerDoc;
}

interface CustomerDoc extends ICustomer, mongoose.Document {}

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    image_url: {
      type: String,
      required: true,
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

customerSchema.statics.build = (attrs: ICustomer) => {
  return new Customer(attrs);
};

const Customer =
  (mongoose.models.Customer as CustomerModel) ||
  mongoose.model<CustomerDoc, CustomerModel>("Customer", customerSchema);

export { Customer };
export type { ICustomer, CustomerDoc };
