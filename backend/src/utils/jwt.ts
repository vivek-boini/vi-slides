import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import type { Types } from "mongoose";
import env from "../config/env";

export interface JwtPayload {
    sub: string;
    role: "teacher" | "student";
    email: string;
    name: string;
}

interface JwtUser {
    _id: Types.ObjectId;
    role: "teacher" | "student";
    email: string;
    name: string;
}

export function signToken(user: JwtUser): string {
    const payload: JwtPayload = {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name
    };

    const options: SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    };

    return jwt.sign(payload, env.JWT_SECRET as Secret, options);
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
