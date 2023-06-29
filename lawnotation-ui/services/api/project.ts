import crudApi from '@/services/common/crud.api';
import { Project } from "@/types/project"

// TODO: figure out why this doens't work:

const projectApi = {
  ...crudApi<Project>()('/api/project')
}

projectApi.create({name: "d", desc: "", editor_id: 'abc' /* default: infered from session */ });

// export default projectApi;


/*
type MyObject = {name: string, color: string}

const method = <T extends object, R extends "/api/a" | "/api/b">(base_url: R) => ({
  something: (y: R) => fetch(`${base_url}/endpoint`) as T
})

const x = method<MyObject>("/api/a");
*/

// ----

const method = <T extends string, R extends string>(val: R) => ({
  something: (x: T) => val
})

method<"a">("/api/r");

// ---

const method2 = <T extends string>(val: T) => ({
  something: (x: T) => val
})

method2("/api/r");