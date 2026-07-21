-- noinspection SqlDialectInspectionForFile

# --- !Ups

-- Species and chain are chosen at upload time and then bind the annotation: a sample is searched
-- against its own species/gene rather than the UI defaults, which is what stops a mouse TRA sample
-- being scored against human TRB.
--
-- Both default to the empty string rather than 'HomoSapiens'/'TRB'. Rows that predate this column
-- genuinely have an unknown chain, and backfilling a guess would assert a fact we do not have;
-- '' reads as "unspecified" and falls back to the existing defaults at annotation time.
ALTER TABLE SAMPLE_FILE ADD SPECIES VARCHAR(32) NOT NULL DEFAULT '';
ALTER TABLE SAMPLE_FILE ADD CHAIN VARCHAR(8) NOT NULL DEFAULT '';

# --- !Downs

ALTER TABLE SAMPLE_FILE DROP COLUMN CHAIN;
ALTER TABLE SAMPLE_FILE DROP COLUMN SPECIES;
