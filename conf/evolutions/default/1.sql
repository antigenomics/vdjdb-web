-- noinspection SqlDialectInspectionForFile

# User schema

# --- !Ups

CREATE TABLE USER (
    ID INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    NAME VARCHAR (255) NOT NULL,
    EMAIL VARCHAR(255) NOT NULL
);

# --- !Downs

DROP TABLE USER;