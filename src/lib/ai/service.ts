import { prisma } from "../db/prisma";
import { researchPacket } from "./packet";
import { aiConfig, generateReport } from "./provider";
export async function runResearch(id:number,expectedHash:string,generate:typeof generateReport=generateReport) {
 const config=aiConfig();if(!config)return "AI გამორთულია. დაამატე API კონფიგურაცია ინსტრუქციის მიხედვით.";
 const packet=await researchPacket(id);if(!packet)return "პროდუქტი მიუწვდომელია.";
 if(packet.hash!==expectedHash)return "მონაცემები შეიცვალა. განაახლე გვერდი და ხელახლა გადახედე გასაგზავნ პაკეტს.";
 const now=new Date();
 const run=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340924)`;
  const day=now.toISOString().slice(0,10);
  const budget=await tx.aiResearchBudget.findUnique({where:{id:"owner"}});
  const attempts=budget?.day===day?budget.attempts:0;
  if(attempts>=10||(budget&&now.getTime()-budget.lastStartedAt.getTime()<90000))return null;
  await tx.aiResearchBudget.upsert({where:{id:"owner"},create:{id:"owner",day,attempts:1,lastStartedAt:now},update:{day,attempts:attempts+1,lastStartedAt:now}});
  return tx.aiResearchRun.create({data:{opportunityId:id,model:config.model,state:"PENDING",inputHash:packet.hash,snapshot:packet.snapshot}});
 });
 if(!run)return "ლიმიტი: მაქსიმუმ 10 მცდელობა UTC დღეში, მინიმუმ 90 წამი მცდელობებს შორის. წარუმატებელი მცდელობაც ითვლება.";
 try{
  const report=await generate(packet.snapshot,packet.sources.map(s=>s.id),config);
  await prisma.aiResearchRun.update({where:{id:run.id},data:{state:"SUCCEEDED",report,finishedAt:new Date()}});
  return "AI ანგარიში შენახულია. გადაამოწმე დასკვნები წყაროებთან; მტკიცებულებები და ხარჯები არ შეცვლილა.";
 }catch{
  await prisma.aiResearchRun.updateMany({where:{id:run.id,state:"PENDING"},data:{state:"FAILED",finishedAt:new Date()}});
  return "AI ანგარიში ვერ დადასტურდა ან ვერ შეინახა. ავტომატური განმეორება არ ხდება; პროვაიდერს შეიძლება მცდელობის საფასური დაერიცხა. გადახედე მიმდინარე ანგარიშებს ხელახლა გაშვებამდე.";
 }
}
