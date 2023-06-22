import { Annotation } from './annotation';
import crudApi from './crudApi';

export type Project = {
  id: number,
  name: string,
  desc: string,
  editor_id: string | undefined
}

/*
const z: any = {};

const project = z.object({
  id: z.number(),
  name: z.string(),
  desc: z.string(),
  editor_id: user.id
})
*/

// TODO: figure out why this doens't work:

const projectApi = {
  ...crudApi<Project>('/api/project')
}

projectApi.create({name: "d", desc: "", editor_id: 'abc' /* default: infered from session */ });

export default projectApi;


//
type MyObject = {name: string, color: string}

const method = <T extends object, R extends "/api/a" | "/api/b">(base_url: R) => ({
  something: (y: R) => fetch(`${base_url}/endpoint`) as T
})

const x = method<MyObject>("/api/a");