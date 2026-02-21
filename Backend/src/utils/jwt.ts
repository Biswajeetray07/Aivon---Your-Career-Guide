import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "aivon-dsa-secret";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
