-- Title: Add left-two-thirds layout
-- Description: Adds the 'left-two-thirds' value to the mixup_layout_id enum

ALTER TYPE mixup_layout_id ADD VALUE IF NOT EXISTS 'left-two-thirds';
