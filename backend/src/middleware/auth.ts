import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { verifyToken, JwtPayload } from "../utils/jwt";

// AUTH MIDDLEWARE
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded: JwtPayload = verifyToken(token);

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // attach user to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ROLE MIDDLEWARE
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};