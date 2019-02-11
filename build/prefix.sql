SET plv8.start_proc = '"lpe"."init"';

CREATE SCHEMA IF NOT EXISTS lpe;

CREATE OR REPLACE FUNCTION
lpe.init(_env JSON DEFAULT '{}')
RETURNS VOID
LANGUAGE 'plv8' STRICT
AS $body$

