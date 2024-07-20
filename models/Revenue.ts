import mongoose from "mongoose";

interface IRevenue {
  month: string;
  revenue: number;
}

interface RevenueModel extends mongoose.Model<RevenueDoc> {
  build(attrs: IRevenue): RevenueDoc;
}

interface RevenueDoc extends IRevenue, mongoose.Document {}

const revenueSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
    },
    revenue: {
      type: Number,
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

revenueSchema.statics.build = (attrs: IRevenue) => {
  return new Revenue(attrs);
};

const Revenue =
  (mongoose.models.Revenue as RevenueModel) ||
  mongoose.model<RevenueDoc, RevenueModel>("Revenue", revenueSchema);

export { Revenue };
export type { IRevenue, RevenueDoc };
