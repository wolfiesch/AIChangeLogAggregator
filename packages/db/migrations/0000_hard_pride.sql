CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"external_id" varchar(255),
	"published_date" date,
	"title" text,
	"content" text NOT NULL,
	"content_html" text,
	"content_hash" varchar(64),
	"url" text,
	"version" varchar(50),
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "changelog_entries_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false,
	"verification_token" varchar(64),
	"unsubscribe_token" varchar(64) NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now(),
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "email_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"logo_url" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"status" varchar(20) NOT NULL,
	"entries_found" integer DEFAULT 0,
	"entries_new" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"url" text NOT NULL,
	"scrape_method" varchar(50) NOT NULL,
	"selector_config" jsonb,
	"last_scraped_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_changelog_entries_published" ON "changelog_entries" USING btree ("published_date");--> statement-breakpoint
CREATE INDEX "idx_changelog_entries_source" ON "changelog_entries" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_changelog_entries_hash" ON "changelog_entries" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_scrape_runs_source" ON "scrape_runs" USING btree ("source_id","started_at");