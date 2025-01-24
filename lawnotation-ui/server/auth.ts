import { betterAuth } from "better-auth";
import postgres from "postgres";
 
export const auth = betterAuth({
    database: new Pool({
        // connection options
    })
})