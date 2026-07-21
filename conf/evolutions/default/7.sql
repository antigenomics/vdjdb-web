-- noinspection SqlDialectInspectionForFile

# --- !Ups

-- Raise the stored-sample cap now that a sample may be up to 200k clonotypes (the shipped demo
-- samples are 64k and 188k rows, so the previous 10-file/10k-row shape was too tight to hold a
-- realistic working set). Sizes are per file, in MiB, and stay as they were: a 200k-row sample
-- compresses to ~5 MiB, well inside both limits.
UPDATE USER_PERMISSIONS SET MAX_FILES_COUNT = 42 WHERE ID = 1;   -- DEFAULT   (registered)
UPDATE USER_PERMISSIONS SET MAX_FILES_COUNT = 10 WHERE ID = 3;   -- TEMPORARY (token accounts)

# --- !Downs

UPDATE USER_PERMISSIONS SET MAX_FILES_COUNT = 10 WHERE ID = 1;
UPDATE USER_PERMISSIONS SET MAX_FILES_COUNT = 3 WHERE ID = 3;
