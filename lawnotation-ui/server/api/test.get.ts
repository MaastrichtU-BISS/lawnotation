import { exec } from 'child_process';

/**
 * Execute simple shell command (async wrapper).
 * @param {String} cmd
 * @return {Object} { stdout: String, stderr: String }
 */
async function sh(cmd: string) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        resolve(err)
        // reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

export default eventHandler(async (event) => {

    console.log(`[SERVER] Python Router Invoked`)

    const pwd = await sh("pwd")
    const python = await sh("python server/api/method.py")
    const python2 = await sh("python2 server/api/method.py")
    const python3 = await sh("python3 server/api/method.py")
    console.log(`[SERVER] pwd ${pwd}`)
    console.log(`[SERVER] 1 ${python}`)
    console.log(`[SERVER] 2 ${python2}`)
    console.log(`[SERVER] 3 ${python3}`)

    return {pwd, python, python2, python3};

})