import { test as setup } from '@playwright/test';
import util from 'util';
import { exec, execSync } from 'child_process';

// const execAsync = util.promisify(exec);
// import path from 'path';

// const parentDir = path.resolve(process.cwd(), '..');

setup('Reset database', ({ }) => {
    //   console.log('Resetting database...');
    //   const command = 'pnpm supabase db reset';

    //   try {
    //     const { stdout, stderr } = await execAsync(command, { cwd: parentDir });
    //     console.log('stdout:', stdout);
    //     console.error('stderr:', stderr);
    //   } catch (error) {
    //     console.error('exec error:', error);
    //   }

    console.log(`Resetting database...`);

    try {
        execSync('npm run supabase:db:reset');

        console.log(`DB reset successful`);
    } catch (error) {
        console.error(`DB reset failed`, error);
    }
});