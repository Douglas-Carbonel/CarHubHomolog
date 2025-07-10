-- Add push subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add service reminders table
CREATE TABLE IF NOT EXISTS "service_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"reminder_minutes" integer DEFAULT 30 NOT NULL,
	"notification_sent" boolean DEFAULT false,
	"scheduled_for" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;