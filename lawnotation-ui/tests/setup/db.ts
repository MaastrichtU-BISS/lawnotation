import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('Reset database', ({ }) => {
    console.log(`Resetting database...`);

    try {
        execSync('npm run supabase:db:reset');

        console.log(`DB reset successful`);
    } catch (error) {
        console.error(`DB reset failed`, error);
    }
});