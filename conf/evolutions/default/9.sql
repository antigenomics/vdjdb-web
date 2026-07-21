-- noinspection SqlDialectInspectionForFile

# --- !Ups

-- The dialect the file arrived in, as opposed to the one it is stored in.
--
-- Every upload is normalised to a VDJtools table at ingest so the annotate path reads one dialect, so
-- SOFTWARE has become a constant 'VDJtools' for anything uploaded since the converter landed - it no
-- longer says anything about the file the user chose. The detected source format was computed, written
-- to the log and then discarded, which is why a MiXCR export displays as "Software: VDJtools".
--
-- Empty rather than backfilled: rows predating the converter were stored in whatever format they
-- arrived in and SOFTWARE is still the truth for them, while rows since carry a format nobody recorded.
-- '' reads as "not recorded" and the UI falls back to SOFTWARE.
ALTER TABLE SAMPLE_FILE ADD SOURCE_SOFTWARE VARCHAR(32) NOT NULL DEFAULT '';

# --- !Downs

ALTER TABLE SAMPLE_FILE DROP COLUMN SOURCE_SOFTWARE;
