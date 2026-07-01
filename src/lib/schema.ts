import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  publicId: text("public_id").notNull(),
  title: text("title"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  ipAddress: varchar("ip_address", { length: 45 }).primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  lastAttempt: timestamp("last_attempt").defaultNow(),
  blockedUntil: timestamp("blocked_until"),
});
