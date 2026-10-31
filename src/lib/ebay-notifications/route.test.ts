import {generateKeyPairSync,sign} from "node:crypto";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({key:vi.fn(),remove:vi.fn()}));
vi.mock("./keys",()=>({notificationKey:mocks.key}));
vi.mock("./deletion",()=>({deleteAccount:mocks.remove}));
import {GET,POST} from "../../app/api/ebay/account-deletion/route";
beforeEach(()=>{vi.stubEnv("EBAY_DELETION_ENDPOINT","https://example.com/api/ebay/account-deletion");vi.stubEnv("EBAY_DELETION_VERIFICATION_TOKEN","a".repeat(32));vi.stubEnv("EBAY_DELETION_HASH_SECRET","b".repeat(32));vi.clearAllMocks();});
afterEach(()=>vi.unstubAllEnvs());
it("answers challenge without provider requests or database mutations",async()=>{
 const r=await GET(new Request("http://localhost/api/ebay/account-deletion?challenge_code=abc"));
 expect(r.status).toBe(200);expect((await r.json()).challengeResponse).toMatch(/^[a-f0-9]{64}$/);
 expect(mocks.key).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
});
it("rejects unsigned deletion without public-key lookup or database access",async()=>{
 const r=await POST(new Request("http://localhost/api/ebay/account-deletion",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({metadata:{topic:"MARKETPLACE_ACCOUNT_DELETION",schemaVersion:"1.0"},notification:{notificationId:"test",data:{userId:"user"}}})}));
 expect(r.status).toBe(412);expect(mocks.key).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
});
it("rejects oversized body and remains disabled when unconfigured",async()=>{
 const r=await POST(new Request("http://localhost/api/ebay/account-deletion",{method:"POST",headers:{"content-type":"application/json"},body:"x".repeat(65537)}));expect(r.status).toBe(413);
 vi.stubEnv("EBAY_DELETION_ENDPOINT","");expect((await GET(new Request("http://localhost/?challenge_code=abc"))).status).toBe(503);
 expect(mocks.remove).not.toHaveBeenCalled();
});

it("processes only a valid signature and returns failure when deletion cannot commit",async()=>{
 const {privateKey,publicKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 mocks.key.mockResolvedValue(publicKey.export({type:"spki",format:"pem"}).toString());
 const payload={metadata:{topic:"MARKETPLACE_ACCOUNT_DELETION",schemaVersion:"1.0"},notification:{notificationId:"test",data:{userId:"user"}}};
 const signature=sign("sha1",Buffer.from(JSON.stringify(payload)),privateKey).toString("base64");
 const header=Buffer.from(JSON.stringify({kid:"key1",signature})).toString("base64");
 const request=()=>new Request("http://localhost/api/ebay/account-deletion",{method:"POST",headers:{"content-type":"application/json","x-ebay-signature":header},body:JSON.stringify(payload)});
 expect((await POST(request())).status).toBe(204);expect(mocks.remove).toHaveBeenCalledWith(payload);
 mocks.remove.mockRejectedValueOnce(new Error("database unavailable"));expect((await POST(request())).status).toBe(503);
 payload.notification.data.userId="tampered";expect((await POST(request())).status).toBe(412);expect(mocks.remove).toHaveBeenCalledTimes(2);
});

it("identifies key-service failures without logging credentials or acknowledging deletion",async()=>{
 const signature=Buffer.from(JSON.stringify({kid:"key1",signature:"YWJj"})).toString("base64");
 mocks.key.mockRejectedValueOnce(new Error("private upstream response"));
 const response=await POST(new Request("http://localhost/api/ebay/account-deletion",{method:"POST",headers:{"content-type":"application/json","x-ebay-signature":signature},body:JSON.stringify({metadata:{topic:"MARKETPLACE_ACCOUNT_DELETION",schemaVersion:"1.0"},notification:{notificationId:"test",data:{userId:"user"}}})}));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({error:"public_key_lookup"});expect(mocks.remove).not.toHaveBeenCalled();
});
