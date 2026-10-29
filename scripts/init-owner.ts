import {randomBytes} from "node:crypto";
import {writeFile,mkdir,access,unlink} from "node:fs/promises";
import {resolve} from "node:path";
import {hashPassword} from "../src/lib/auth/core";
async function main(){
 const file=resolve(".env.local"),directory=resolve("../.cloud-setup"),credentialFile=resolve(directory,"owner-access.txt");
 try{await access(file);throw new Error("Existing .env.local preserved; configure owner settings manually or rotate deliberately.");}catch(e){if(!(e instanceof Error)||!("code" in e)||e.code!=="ENOENT")throw e;}
 const password=randomBytes(24).toString("base64url");await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(credentialFile,`Arbitrage Finder owner access\nLocal sign-in: http://127.0.0.1:3000/login\nPassword: ${password}\nKeep this file private. It is not a production hosting configuration.\n`,{mode:0o600,flag:"wx"});
 try{await writeFile(file,`APP_ORIGIN=http://127.0.0.1:3000\nAPP_PASSWORD_HASH=${hashPassword(password)}\n`,{mode:0o600,flag:"wx"});}catch(e){await unlink(credentialFile);throw e;}
 console.log("Owner authentication initialized. Password is only in /workspace/.cloud-setup/owner-access.txt; .env.local is ignored. No credential values logged.");
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Owner initialization failed");process.exitCode=1;});
