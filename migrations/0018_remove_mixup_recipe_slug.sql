-- Title: Remove Legacy Mixup Recipe Slug
-- Description: Removes the denormalized mixup_slots.recipe_slug column after recipe_id became the only recipe reference.

UPDATE mixup_slots AS slot
SET recipe_id = (
    SELECT recipe.id
    FROM mixups AS mixup
    JOIN recipes AS recipe
        ON recipe.slug = slot.recipe_slug
    WHERE mixup.id = slot.mixup_id
        AND (
            recipe.user_id IS NOT DISTINCT FROM mixup.user_id
            OR recipe.user_id IS NULL
        )
    ORDER BY CASE
        WHEN recipe.user_id IS NOT DISTINCT FROM mixup.user_id THEN 0
        ELSE 1
    END
    LIMIT 1
)
WHERE slot.recipe_id IS NULL
    AND slot.recipe_slug IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM mixups AS mixup
        JOIN recipes AS recipe
            ON recipe.slug = slot.recipe_slug
        WHERE mixup.id = slot.mixup_id
            AND (
                recipe.user_id IS NOT DISTINCT FROM mixup.user_id
                OR recipe.user_id IS NULL
            )
    );

ALTER TABLE mixup_slots DROP COLUMN IF EXISTS recipe_slug;
