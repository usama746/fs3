-- Complete database fix for inventory app
-- Run this in your Supabase SQL Editor

-- 1. Drop existing foreign key constraints
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_user_id_fkey;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_id_fkey;

-- 2. Make user_id columns nullable
ALTER TABLE categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE items ALTER COLUMN user_id DROP NOT NULL;

-- 3. Recreate foreign key constraints with proper settings
ALTER TABLE categories 
ADD CONSTRAINT categories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE items 
ADD CONSTRAINT items_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE items 
ADD CONSTRAINT items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Drop all existing RLS policies (including the new ones we'll create)
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON items;
DROP POLICY IF EXISTS "Public read access for categories" ON categories;
DROP POLICY IF EXISTS "Public read access for items" ON items;
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "items_select_policy" ON items;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "items_insert_policy" ON items;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "items_update_policy" ON items;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;
DROP POLICY IF EXISTS "items_delete_policy" ON items;

-- Also drop the new policy names we're about to create
DROP POLICY IF EXISTS "categories_select_all" ON categories;
DROP POLICY IF EXISTS "items_select_all" ON items;
DROP POLICY IF EXISTS "categories_insert_authenticated" ON categories;
DROP POLICY IF EXISTS "items_insert_authenticated" ON items;
DROP POLICY IF EXISTS "categories_update_owner" ON categories;
DROP POLICY IF EXISTS "items_update_owner" ON items;
DROP POLICY IF EXISTS "categories_delete_owner" ON categories;
DROP POLICY IF EXISTS "items_delete_owner" ON items;

-- 5. Create simple, working RLS policies
CREATE POLICY "categories_select_all" ON categories
    FOR SELECT USING (true);

CREATE POLICY "items_select_all" ON items
    FOR SELECT USING (true);

CREATE POLICY "categories_insert_authenticated" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "items_insert_authenticated" ON items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update_owner" ON categories
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid()::uuid OR user_id IS NULL)
    );

CREATE POLICY "items_update_owner" ON items
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid()::uuid OR user_id IS NULL)
    );

CREATE POLICY "categories_delete_owner" ON categories
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid()::uuid OR user_id IS NULL)
    );

CREATE POLICY "items_delete_owner" ON items
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid()::uuid OR user_id IS NULL)
    );

-- 6. Show final table structure
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('categories', 'items')
ORDER BY table_name, ordinal_position; 