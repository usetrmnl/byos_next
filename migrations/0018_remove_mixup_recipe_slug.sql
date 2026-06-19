-- Title: Remove Legacy Mixup Recipe Slug
-- Description: Removes the denormalized mixup_slots.recipe_slug column after recipe_id became the only recipe reference.

ALTER TABLE mixup_slots DROP COLUMN IF EXISTS recipe_slug;
