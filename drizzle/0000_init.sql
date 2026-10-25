CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"headline" text NOT NULL,
	"subline" text DEFAULT '' NOT NULL,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"starts_at" text,
	"ends_at" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departures" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"price" integer NOT NULL,
	"seats_total" integer NOT NULL,
	"seats_left" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"things_to_do" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"travel_info" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero" jsonb NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"best_months" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"enquiry_id" integer,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"travel_month" text,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"departure_city" text,
	"budget" text,
	"message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent" boolean NOT NULL,
	"package_id" integer,
	"destination_id" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"lost_reason" text,
	"quoted_amount" integer,
	"assignee_id" integer,
	"follow_up_at" timestamp with time zone,
	"source" text DEFAULT 'direct' NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referrer" text,
	"page_url" text,
	"email_status" text DEFAULT 'pending' NOT NULL,
	"first_contact_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"caption" text NOT NULL,
	"alt" text NOT NULL,
	"color" text NOT NULL,
	"url" text,
	"destination_slug" text,
	"credit" text,
	"people_consent" boolean DEFAULT true NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"enquiry_id" integer NOT NULL,
	"actor_id" integer,
	"kind" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"email" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"badge" text NOT NULL,
	"discount_type" text DEFAULT 'flat' NOT NULL,
	"amount" integer NOT NULL,
	"package_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"valid_from" text NOT NULL,
	"valid_to" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"destination_id" integer NOT NULL,
	"trip_type" text NOT NULL,
	"nights" integer NOT NULL,
	"route" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"price_from" integer NOT NULL,
	"price_note" text DEFAULT 'Twin sharing, excluding flights.' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"travel_months" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hotels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cancellation_policy" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author" text DEFAULT 'Safarscape team' NOT NULL,
	"read_minutes" integer DEFAULT 5 NOT NULL,
	"hero" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"featured" boolean DEFAULT false NOT NULL,
	"related_package_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trip" text NOT NULL,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"source" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"show_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'sales' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phone" text,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departures" ADD CONSTRAINT "departures_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_idx" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiries_reference_idx" ON "enquiries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enquiries_phone_idx" ON "enquiries" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_slug_idx" ON "packages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "packages_status_idx" ON "packages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");