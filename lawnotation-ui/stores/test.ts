import { defineStore } from "pinia";
import { useUserApi } from "~/data/user";

/*
- required features:
    - lazy-loading
    - loading of single entities
    - (lazy) loading of 'relation-data' in foreign stores
- recommended/prefered features:
    - a 'loading' indicator for each query (single item, list of items or related items)
    - everything fetched is kept in state. however, for example when fetching a table page,
      when navigating to a seperate page, the previously loaded elements may be freed. 
      Though, this could cause an item initially loaded elsewhere to be freed up while still in use. Include 'consumers' in store and free up those without ?
*/

// ------------ CONCEPT 1 ------------

interface IUser {
  id: string,
  email: string,
  role: "editor" | "annotator"
}

export const useUserStore = defineStore('user', () => {
  const _users = reactive<Record<IUser['id'], IUser>>({});

  const findById = async (id: IUser['id']) => {
    const userApi = useUserApi();
    const user = await userApi.findByEmail('') as IUser;
    _users[user.id] = user;
    return _users[user.id];
  }

  return {
    findById
  }
});

const userStore = useUserStore();
userStore.findById('xyz')

interface IProject {
  id: number,
  name: string
}

export const useProjectStore = defineStore('project', () => {
  const _projects = reactive<Record<IProject['id'], IProject>>({});
  const _add = (project: IProject) => {
    _projects[project.id] = project
    return _projects[project.id]
  }

  const findByUser = async (user: IUser) => {
    const project = {} as IProject;
    return _add(project);
  }

  return {
    findByUser
  }
});

// ------------ CONCEPT 2 ------------

interface IResponse<T> {
  loading: boolean,
  data: null | T
}

// /api/user.ts

const useUserApi = () => {
  const findById = async (id: string) => {
    const response = {
      loading: true,
      data: null
    } as IResponse<IUser>;

    Promise.resolve({} as IUser).then((u) => response.data = u)
    
    return response
  }

  return findById
}

const useUserData = () => {

}