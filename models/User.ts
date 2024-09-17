import { Password } from "@/app/lib/passwordEncryptDecrypt";
import mongoose from "mongoose";

interface IUser {
  name: string;
  email: string;
  password: string;
}

//interface describes props that a User Document has
interface UserDoc extends IUser, mongoose.Document {}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    //manipulate the JSON representation
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.__v;
      },
    },
  }
);

userSchema.pre("save", async function (done) {
  if (!this.isModified("password")) return done();

  const hashed = await Password.toHash(this.get("password"));
  this.set("password", hashed);
  done();
});

interface UserModel extends mongoose.Model<UserDoc> {
  // custom methods defination
  build(attrs: IUser): UserDoc;
}

userSchema.statics.build = (attrs: IUser) => {
  return new User(attrs);
};
const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
