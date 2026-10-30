// 초기 시드: 관리자 계정, 기본 아이템 5종, 초대 코드 몇 개, 샘플 공지.
// 아이템은 운영자가 관리자 페이지에서 고치거나 지울 수 있다.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedSampleInstantTemplate, seedSampleRealm } from "./seed-realm";

const db = new PrismaClient();

async function main() {
  const loginId = process.env.ADMIN_LOGIN_ID ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";

  const admin = await db.user.upsert({
    where: { loginId },
    update: {},
    create: { loginId, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
  });
  console.log(`관리자 계정: ${loginId}`);

  // 초대 코드
  const codes = ["WELCOME-0001", "WELCOME-0002", "WELCOME-0003", "WELCOME-0004", "WELCOME-0005"];
  for (const code of codes) {
    await db.inviteCode.upsert({
      where: { code },
      update: {},
      create: { code, note: "초기 시드", createdById: admin.id },
    });
  }
  console.log(`초대 코드: ${codes.join(", ")}`);

  // 기본 아이템 5종 (SPEC.md 초안)
  const items = [
    { name: "회복약", description: "능력자용 체력 회복제. 쓴맛이 나지만 효과는 확실하다.", effects: [{ type: "hp", value: 3 }], price: 30, sellPrice: 10, sortOrder: 1 },
    { name: "정신 안정제", description: "정신을 가라앉히는 약. 이계의 소음이 조금은 멀어진다.", effects: [{ type: "mp", value: 3 }], price: 30, sellPrice: 10, sortOrder: 2 },
    { name: "침식 억제제", description: "침식률을 낮추는 주사제. 프로그램이 권장하는 기본 처치.", effects: [{ type: "erosion", value: -10 }], price: 60, sellPrice: 20, sortOrder: 3 },
    { name: "이능 강화제", description: "이번 탐사 동안 이능을 끌어올린다. 침식률이 함께 오른다.", effects: [{ type: "run_check_bonus", checkType: "OWN", value: 1 }, { type: "erosion", value: 5 }], price: 50, sellPrice: 15, usableIn: "RUN" as const, sortOrder: 4 },
    { name: "귀환 비컨", description: "작동시키면 이계에서 즉시 빠져나온다. 밝힌 지도는 보존된다.", effects: [{ type: "escape" }], price: 100, sellPrice: 30, usableIn: "RUN" as const, sortOrder: 5 },
    { name: "인자 추출 도구", description: "감염물에서 현실조작인자를 뽑아내는 장치. 본부는 이 기술을 아무에게나 허락하지 않는다.", effects: [{ type: "extractor" }], price: 300, sellPrice: 100, usableIn: "OUTSIDE" as const, sortOrder: 7, category: "KEY" as const, stackLimit: 1, minEscapes: 10 },
    { name: "낡은 공구", description: "조합의 바탕이 되는 평범한 공구. 인자를 붙이면 이계의 특성을 띤 장비가 된다.", effects: [], price: 80, sellPrice: 20, usableIn: "OUTSIDE" as const, sortOrder: 8, category: "MATERIAL" as const },
    { name: "감염 공구", description: "현실조작인자가 깃든 공구. 손에 쥐면 손끝이 조금 더 빨라진다.", effects: [{ type: "run_check_bonus", checkType: "ALL", value: 1 }], price: 0, sellPrice: 60, usableIn: "OUTSIDE" as const, sortOrder: 9, category: "EQUIPMENT" as const, shop: false },
    { name: "이계용 비디오 카메라", description: "이계 안에서도 기록이 남는 특수 카메라. 지니고 입장하면 그 탐사의 카메라 로그를 쓸 수 있다.", effects: [{ type: "camera" }], price: 150, sellPrice: 50, usableIn: "BOTH" as const, sortOrder: 6, category: "KEY" as const, stackLimit: 1 },
  ];
  for (const it of items) {
    const existing = await db.item.findFirst({ where: { name: it.name } });
    if (existing) continue;
    await db.item.create({
      data: {
        name: it.name,
        description: it.description,
        category: ("category" in it ? it.category : "CONSUMABLE"),
        stackLimit: "stackLimit" in it ? it.stackLimit : 99,
        effects: it.effects,
        usableIn: it.usableIn ?? "BOTH",
        shopEnabled: "shop" in it ? it.shop : true,
        minEscapes: "minEscapes" in it ? it.minEscapes : 0,
        price: it.price,
        sellPrice: it.sellPrice,
        sortOrder: it.sortOrder,
      },
    });
  }
  console.log("기본 아이템 확인");
  // 생산 시드: 감염물 태그, 특성 보너스, 레시피
  await db.item.updateMany({ where: { name: "감염된 수액팩", traitTag: "" }, data: { traitTag: "멈춘 시간" } });
  if (!(await db.factorTrait.findUnique({ where: { tag: "멈춘 시간" } }))) await db.factorTrait.create({ data: { tag: "멈춘 시간", description: "손에 쥔 동안 주변의 시간이 아주 조금 늦게 흐른다.", bonusEffects: [{ type: "run_check_bonus", checkType: "SEARCH", value: 1 }] } });
  const base = await db.item.findFirst({ where: { name: "낡은 공구" } });
  const result = await db.item.findFirst({ where: { name: "감염 공구" } });
  if (base && result && (await db.recipe.count()) === 0) await db.recipe.create({ data: { name: "공구에 인자 깃들이기", baseItemId: base.id, resultItemId: result.id, checkTarget: 7 } });

  await seedSampleRealm(db);
  await seedSampleInstantTemplate(db);

  if ((await db.notice.count()) === 0) {
    await db.notice.create({
      data: {
        title: "프로그램 설치를 환영합니다",
        body: "이 프로그램은 당신 주변의 이계를 감지하고, 같은 힘을 가진 사람들과 당신을 이어 줍니다.\n\n침식률이 높아지면 힘이 폭주할 수 있습니다. 사람들과 어울려 지내는 것이 침식률을 낮추는 가장 확실한 방법입니다.",
        pinned: true,
        authorId: admin.id,
      },
    });
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
