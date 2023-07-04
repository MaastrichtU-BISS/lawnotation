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

    const { cmd } = await readBody(event);

    const resp = await sh(cmd)
    
    console.log(`[SERVER] $${ cmd }: ${resp}`)

    return resp;

})