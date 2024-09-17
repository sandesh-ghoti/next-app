import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { UserType } from "./app/lib/definitions";
import { User } from "./models/User";
import { Password } from "./app/lib/passwordEncryptDecrypt";
import { dbConnect } from "./app/lib/dbConnect";

async function getUser(email: string): Promise<UserType | undefined> {
  await dbConnect();
  try {
    const user = await User.findOne(
      { email: "user@nextmail.com" },
      "id name email password"
    ).exec();
    if (!user) {
      return undefined;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
    };
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const isMatched = await Password.compare(user.password, password);
          if (isMatched) {
            return user;
          }
        }
        return null;
      },
    }),
  ],
});
