import { Assignment } from './../../../data/assignment';
export default eventHandler(async (event) => {
  const data = await readBody(event)
  return { data }
})

function createContingencyTable(annotations: any) {

}