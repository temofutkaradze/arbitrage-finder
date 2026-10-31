import {generateKeyPairSync,sign,createHash} from "node:crypto";
import {expect,it} from "vitest";
import {challengeResponse,verifyNotification,signatureHeader,identityHash,deletionSchema} from "./protocol";
it("returns eBay's exact SHA256 challenge order and rejects malformed challenge input",()=>{
 expect(challengeResponse("abc","token","https://example.com/path")).toBe(createHash("sha256").update("abctokenhttps://example.com/path").digest("hex"));
 expect(()=>challengeResponse("","token","url")).toThrow();
});
it("verifies an authentic EC SHA1 notification and rejects altered content and signatures",()=>{
 const {privateKey,publicKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 const payload={notification:{value:"original"}};
 const signature=sign("sha1",Buffer.from(JSON.stringify(payload)),privateKey).toString("base64");
 const header=Buffer.from(JSON.stringify({kid:"key1",signature})).toString("base64");
 const key=publicKey.export({type:"spki",format:"pem"}).toString();
 expect(verifyNotification(payload,header,key)).toBe(true);
 expect(verifyNotification({notification:{value:"changed"}},header,key)).toBe(false);
 expect(()=>signatureHeader("https://evil.example/key")).toThrow();
});
it("keeps identifiers private and validates deletion topics",()=>{
 expect(identityHash("Seller","secret")).toBe(identityHash("seller","secret"));
 expect(identityHash("Seller","secret")).not.toContain("seller");
 expect(deletionSchema.safeParse({metadata:{topic:"OTHER"}}).success).toBe(false);
});
