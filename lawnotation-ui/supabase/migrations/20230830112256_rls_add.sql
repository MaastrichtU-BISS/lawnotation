-- Drop Existing Policies
DROP POLICY "Allow Post to everyone" ON "public"."annotations";
DROP POLICY "Allow update to everyone" ON "public"."annotations";
DROP POLICY "Enable delete for users based on user_id" ON "public"."annotation_relations";
DROP POLICY "Enable delete for users based on user_id" ON "public"."assignments";
DROP POLICY "Enable delete for users based on user_id" ON "public"."documents";
DROP POLICY "Enable delete for users based on user_id" ON "public"."labelsets";
DROP POLICY "Enable delete for users based on user_id" ON "public"."projects";
DROP POLICY "Enable delete for users based on user_id" ON "public"."tasks";
DROP POLICY "Enable delete for users for everone (TODO)" ON "public"."annotations";
DROP POLICY "Enable insert for authenticated users only" ON "public"."annotation_relations";
DROP POLICY "Enable insert for authenticated users only" ON "public"."assignments";
DROP POLICY "Enable insert for authenticated users only" ON "public"."documents";
DROP POLICY "Enable insert for authenticated users only" ON "public"."labelsets";
DROP POLICY "Enable insert for authenticated users only" ON "public"."tasks";
DROP POLICY "Enable read access for all users" ON "public"."annotation_relations";
DROP POLICY "Enable read access for all users" ON "public"."annotations";
DROP POLICY "Enable read access for all users" ON "public"."assignments";
DROP POLICY "Enable read access for all users" ON "public"."documents";
DROP POLICY "Enable read access for all users" ON "public"."labelsets";
DROP POLICY "Enable read access for all users" ON "public"."projects";
DROP POLICY "Enable read access for all users" ON "public"."tasks";
DROP POLICY "Enable read access for all users" ON "public"."users";
DROP POLICY "Enable update for users based on email" ON "public"."annotation_relations";
DROP POLICY "Enable update for users based on email" ON "public"."assignments";
DROP POLICY "Enable update for users based on email" ON "public"."labelsets";
DROP POLICY "Users can update own profile." ON "public"."users";
DROP POLICY "allow everyone to create project " ON "public"."projects";
--

-- Add New Policies
-- reference: https://github.com/orgs/MaastrichtU-BISS/projects/1?pane=issue&itemId=36638201

-- -- annotation_relations -- --

CREATE POLICY "Restrict access to project EDITOR and related ASSIGNEES" ON "public"."annotation_relations"
FOR ALL TO "authenticated" 
USING (
  EXISTS (
    SELECT 1
    FROM "public"."assignments" AS a
    JOIN "public"."annotations" AS an ON a.id = an.assignment_id
    JOIN "public"."annotation_relations" AS ar ON an.id = ar.from_id OR an.id = ar.to_id
    JOIN "public"."tasks" AS t ON a.task_id = t.id
    JOIN "public"."projects" AS p ON t.project_id = p.id
    WHERE (
      p.creator_id = "auth"."uid"() OR
      a.assignee_id = "auth"."uid"()
    )
  )
);

-- -- annotations -- --

CREATE POLICY "Restrict access to project EDITOR and related ASSIGNEES" ON "public"."annotations"
FOR ALL TO "authenticated" USING (
  assignment_id IN (
    SELECT assignments.id
    FROM assignments
    JOIN tasks ON assignments.task_id = tasks.id
    JOIN projects ON tasks.project_id = projects.id
    WHERE (
      assignments.annotator_id = "auth"."uid"() OR
      projects.editor_id = "auth"."uid"()
    )
  )
);

-- -- assignments -- --

-- SELECT AND UPDATE

CREATE POLICY "Restrict SELECT and UPDATE access to project EDITOR and related ASSIGNEE" ON "public"."assignments"
FOR SELECT, UPDATE TO "authenticated" USING (
  EXISTS (
    SELECT 1
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE (
      assignments.task_id = tasks.id AND (
        assignments.annotator_id = "auth"."uid"() OR
        projects.editor_id = "auth"."uid"()
      )
    )
  )
);

-- DELETE

CREATE POLICY "Restrict DELETE access to project EDITOR" ON "public"."assignments"
FOR DELETE TO "authenticated" USING (
  EXISTS (
    SELECT 1
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE (
      assignments.task_id = tasks.id AND
      projects.editor_id = "auth"."uid"()
    )
  )
);

-- -- documents -- --


CREATE POLICY "Restrict SELECT access to project EDITOR and related ASSIGNEES" ON "public"."documents"
FOR SELECT TO "authenticated" USING (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.creator_id = "auth"."uid"()
  )
  OR project_id IN (
    SELECT tasks.project_id 
    FROM tasks 
    JOIN assignments ON tasks.id = assignments.task_id 
    WHERE assignments.assignee_id = "auth"."uid"()
  )
);

CREATE POLICY "Restrict DELETE and UPDATE access to project EDITOR" ON "public"."documents"
FOR DELETE, UPDATE TO "authenticated" USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE (
      documents.id = projects.id AND
      projects.editor_id = "auth"."uid"()
    )
  )
);

-- -- labelsets -- --

CREATE POLICY "Restrict SELECT access to related USER, project EDITOR and related ASSIGNEE" ON "public"."labelsets" 
FOR SELECT TO "authenticated" USING (
  id IN (
    SELECT labelsets.id
    FROM labelsets
    WHERE (
      labelsets.creator_id = "auth"."uid"() OR
      labelsets.id IN (
        SELECT tasks.labelset_id
        FROM tasks
        JOIN projects ON tasks.project_id = projects.id
        WHERE projects.creator_id = "auth"."uid"()
      ) OR
      labelsets.id IN (
        SELECT tasks.labelset_id
        FROM tasks
        JOIN assignments ON tasks.id = assignments.task_id
        WHERE assignments.assignee_id = "auth"."uid"()
      )
    )
  )
);

CREATE POLICY "Restrict DELETE and UPDATE to related USER" ON "public"."labelsets"
FOR DELETE, UPDATE TO "authenticated" USING (
  editor_id = "auth"."uid"()
);

-- -- projects -- --

CREATE POLICY "Restrict SELECT access to project EDITOR and related ASSIGNEES" ON "public"."projects" 
FOR SELECT USING (
  editor_id = "auth"."uid"() OR
  id IN (
    SELECT tasks.project_id
    FROM tasks
    JOIN assignments ON tasks.id = assignments.task_id
    WHERE assignments.annotator_id = "auth"."uid"()
  )
);

CREATE POLICY "Restrict DELETE and UPDATE access to EDITOR" ON "public"."projects" 
FOR DELETE, UPDATE USING (
  creator_id = "auth"."uid"()
);

-- -- tasks -- --

CREATE POLICY "Restrict SELECT access to project EDITOR and ASSIGNEE" ON "public"."tasks"
FOR SELECT USING (
  id IN (
    SELECT tasks.id
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    JOIN assignments ON tasks.id = assignments.task_id
    WHERE (
      projects.creator_id = "auth"."uid"() OR
      assignments.assignee_id = "auth"."uid"()
    )
  )
);

CREATE POLICY "Restrict DELETE and UPDATE access to project EDITOR" ON "public"."tasks"
FOR DELETE, UPDATE USING (
  id IN (
    SELECT tasks.id
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE projects.creator_id = "auth"."uid"()
  )
);

-- -- users -- --

CREATE POLICY "Restrict SELECT access to the USER itself and related projects EDITORS" ON "public"."users"
FOR SELECT USING (
  id = "auth"."uid"() OR
  id IN (
    SELECT projects.editor_id
    FROM projects
    WHERE projects.editor_id = "auth"."uid"() OR
    EXISTS (
      SELECT 1
      FROM tasks
      WHERE (
        tasks.project_id = projects.id AND
        tasks.assignee_id = "auth"."uid"()
      )
    )
  )
);

CREATE POLICY "Restrict DELETE and UPDATE access to USER itself" ON "public"."users"
FOR DELETE, UPDATE USING (
  id = "auth"."uid"()
);