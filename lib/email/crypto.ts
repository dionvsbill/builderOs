import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function keyBytes(){
 const raw=process.env.SMTP_ENCRYPTION_KEY;
 if(!raw)throw new Error("SMTP_ENCRYPTION_KEY is not configured.");
 const key=Buffer.from(raw,"base64");
 if(key.length!==32)throw new Error("SMTP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
 return key;
}
export function encryptSmtpPassword(password:string){
 const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",keyBytes(),iv);
 const encrypted=Buffer.concat([cipher.update(password,"utf8"),cipher.final()]);
 return [iv.toString("hex"),cipher.getAuthTag().toString("hex"),encrypted.toString("hex")].join(":");
}
export function decryptSmtpPassword(value:string){
 const [ivHex,tagHex,cipherHex]=value.split(":");
 if(!ivHex||!tagHex||!cipherHex)throw new Error("Stored SMTP secret is invalid.");
 const decipher=createDecipheriv("aes-256-gcm",keyBytes(),Buffer.from(ivHex,"hex"));
 decipher.setAuthTag(Buffer.from(tagHex,"hex"));
 return Buffer.concat([decipher.update(Buffer.from(cipherHex,"hex")),decipher.final()]).toString("utf8");
}