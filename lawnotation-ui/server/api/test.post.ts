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

    const body = await readBody(event);

    if (body && body.cmd) {
      const resp = await sh(body.cmd)
      
      console.log(`[SERVER] $${ body.cmd }: ${resp}`)
  
      return resp;
    }

    return {error: "no command"}

})