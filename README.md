# Budget-tracker

## Supabase schema guide

The Supabase database schema for this project is defined in [supabase-schema.sql](supabase-schema.sql). The best place to keep the detailed guide is this README so anyone opening the project can find setup and table information in one place.

### What this schema does

This project uses Supabase as the backend for storing user-specific budget data. The schema is designed to support:

- user profiles
- transaction history
- savings goals
- debt tracking
- row-level security for per-user access

### Tables

1. profiles
   - Stores one row per authenticated user.
   - Columns:
     - id: links to Supabase Auth user
     - email: the user's email address
     - handCash: current cash amount displayed in the app
     - theme: UI theme preference
     - categories: array of custom transaction categories
   - Purpose: keeps app settings and profile information for each user.

2. transactions
   - Stores every budget transaction.
   - Columns:
     - id: unique transaction ID
     - user_id: owner of the transaction
     - date: transaction date as text
     - description: transaction description
     - category: category name
     - amount: numerical value
     - type: income or expense
   - Purpose: tracks all recorded transactions.

3. goals
   - Stores financial goals.
   - Columns:
     - id: unique goal ID
     - user_id: owner of the goal
     - name: goal title
     - target: target amount
     - current: current saved amount
     - date: target completion date
   - Purpose: tracks progress toward savings targets.

4. debts
   - Stores debt or loan records.
   - Columns:
     - id: unique debt ID
     - user_id: owner of the debt record
     - date: record date
     - entityName: lender/borrower name
     - email: contact email
     - amount: debt amount
     - type: lent or borrowed
     - settled: whether the debt is settled
   - Purpose: tracks money borrowed or lent.

### Row Level Security (RLS)

Each table has RLS enabled. The policies ensure that users can only access their own data:

- users can view, insert, update, and delete only their own rows
- data is protected even when the app is connected to the same Supabase project

### How to apply the schema

1. Open your Supabase project dashboard.
2. Go to SQL Editor.
3. Paste the contents of [supabase-schema.sql](supabase-schema.sql).
4. Run the script.
5. Confirm the tables and policies were created successfully.

### Notes for this app

- The app expects the tables to exist before it can sync data with Supabase.
- The frontend uses the following table names exactly:
  - profiles
  - transactions
  - goals
  - debts
- Make sure authentication is enabled in Supabase for the app to work with user-based storage.

### Expected result

After applying the schema, the app can:

- save and load user data from Supabase
- keep data private per user
- sync changes automatically while a user is signed in
