import "dotenv/config";
import {Client} from "pg";
import {assertSafeDatabaseUrls} from "../src/lib/db/guard";
async function main(){
 assertSafeDatabaseUrls(process.env.DATABASE_URL,process.env.SHADOW_DATABASE_URL);
 const main=new URL(process.env.DATABASE_URL!),shadow=new URL(process.env.SHADOW_DATABASE_URL!);
 if(!["127.0.0.1","localhost","[::1]"].includes(main.hostname)||main.host!==shadow.host||main.username!==shadow.username)throw new Error("Local setup only accepts matching loopback PostgreSQL connections.");
 const admin=new URL(main);admin.pathname="/postgres";
 const client=new Client({connectionString:admin.toString(),connectionTimeoutMillis:10000});
 try{
  await client.connect();
  for(const name of ["arbitrage","arbitrage_shadow"]){
   const exists=await client.query("SELECT 1 FROM pg_database WHERE datname=$1",[name]);
   if(!exists.rowCount){await client.query(name==="arbitrage"?'CREATE DATABASE "arbitrage"':'CREATE DATABASE "arbitrage_shadow"');console.log(`Created ${name}.`);}
   else console.log(`${name} already exists; preserved. Back up existing data before applying migrations.`);
  }
 }finally{await client.end();}
}
main().catch(()=>{console.error("Local PostgreSQL preparation failed. Verify PostgreSQL is running, .env credentials/port are correct, and the role can connect to postgres and create databases. No database was reset or dropped.");process.exitCode=1;});
