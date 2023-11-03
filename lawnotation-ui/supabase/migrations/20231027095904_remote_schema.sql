-- alter table "auth"."saml_relay_states" add column "flow_state_id" uuid;

-- CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);

-- alter table "auth"."saml_relay_states" add constraint "saml_relay_states_flow_state_id_fkey" FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE not valid;

-- alter table "auth"."saml_relay_states" validate constraint "saml_relay_states_flow_state_id_fkey";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


