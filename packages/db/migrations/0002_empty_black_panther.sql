CREATE TABLE "auth_magic_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"session_token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_subscriber_id_email_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."email_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_subscriber_id_email_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."email_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_subscriber_id_email_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."email_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_magic_links_subscriber" ON "auth_magic_links" USING btree ("subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_magic_links_token" ON "auth_magic_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_subscriber" ON "auth_sessions" USING btree ("subscriber_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_sessions_token" ON "auth_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "idx_user_follows_subscriber" ON "user_follows" USING btree ("subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_follows_unique" ON "user_follows" USING btree ("subscriber_id","product_id");