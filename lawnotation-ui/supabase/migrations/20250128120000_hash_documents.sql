-- create hash col
alter table "public"."documents" add column "hash" character(40);

-- update all instances in db
UPDATE documents SET hash = encode(digest(full_text, 'sha1'), 'hex');

-- create trigger function to set hash to full_text content
CREATE OR REPLACE FUNCTION set_document_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash := encode(digest(NEW.full_text, 'sha1'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- assign trigger to insert on document table
CREATE OR REPLACE TRIGGER set_document_hash_trigger
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION set_document_hash();