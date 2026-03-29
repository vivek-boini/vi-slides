import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI || !JWT_SECRET) {
    console.error("Missing environment variables");
    process.exit(1);
}

const PORT_ENV = process.env.PORT;
const PORT = PORT_ENV === undefined ? 3000 : Number.parseInt(PORT_ENV, 10);

if (Number.isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error(`Invalid PORT environment variable: ${PORT_ENV}`);
    process.exit(1);
}

const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    MONGODB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d"
};

export default env;