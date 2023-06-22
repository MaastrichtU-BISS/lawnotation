// from: https://stackoverflow.com/a/41621478
export function getFunctionCaller (){
  const stackmatch = (new Error()).stack?.match(/at (\S+)/g);
  return stackmatch ? stackmatch[1].slice(3) : null;
}